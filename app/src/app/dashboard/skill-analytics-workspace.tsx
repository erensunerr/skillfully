"use client";

import { useState } from "react";
import { BrandedSelect, DropdownChevron } from "@/components/branded-select";
import type { Feedback, RecentFeedbackRow, SkillUsageEvent } from "./dashboard-model";
import { DASHBOARD_CARD, formatTimestamp, ratingSummary, toMillis, usageEventLabel, usageSummary } from "./dashboard-model";
import { SearchIcon } from "./dashboard-icons";
import { sentimentLabel } from "./skill-overview";

function AnalyticsSummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`${DASHBOARD_CARD} p-5`}>
      <h2 className="font-editorial-sans text-2xl font-semibold">{title}</h2>
      <div className="mt-3 font-editorial-sans text-4xl font-semibold">{value}</div>
      <p className="mt-4 text-sm leading-6 text-[var(--ink)]/70">{detail}</p>
    </article>
  );
}

function analyticsRowsFromEntries(entries: Feedback[]) {
  return [...entries]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .map((entry) => {
      const sentiment: RecentFeedbackRow["sentiment"] =
        entry.rating === "negative" ? "negative" : entry.rating === "neutral" ? "neutral" : "positive";

      return {
        time: formatTimestamp(entry.createdAt),
        sentiment,
        source: "Feedback API",
        feedback: entry.feedback,
      };
    });
}

export function analyticsRowsFromUsageEvents(events: SkillUsageEvent[]) {
  return [...events]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 12)
    .map((event, index) => ({
      rowKey:
        typeof event.id === "string" && event.id
          ? event.id
          : `${toMillis(event.createdAt)}-${String(event.eventKind || "unknown")}-${String(event.source || "Skillfully")}-${index}`,
      time: formatTimestamp(event.createdAt),
      event: usageEventLabel(String(event.eventKind || "unknown")),
      source: typeof event.source === "string" ? event.source : "Skillfully",
      detail: typeof event.path === "string" ? event.path : typeof event.versionId === "string" ? event.versionId : "-",
    }));
}

export function SkillAnalyticsWorkspace({
  entries,
  usageEvents,
}: {
  entries: Feedback[];
  usageEvents: SkillUsageEvent[];
}) {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("24h");
  const [sentiments, setSentiments] = useState<Array<RecentFeedbackRow["sentiment"]>>([
    "positive",
    "neutral",
    "negative",
  ]);
  const rows = analyticsRowsFromEntries(entries);
  const counts = ratingSummary(entries);
  const usageCounts = usageSummary(usageEvents);
  const usageRows = analyticsRowsFromUsageEvents(usageEvents);
  const ratedTotal = counts.positive + counts.neutral + counts.negative;
  const positiveRate = ratedTotal > 0 ? `${Math.round((counts.positive / ratedTotal) * 100)}%` : "0%";
  const visibleRows = rows.filter(({ sentiment, source, feedback }) => {
    const matchesSentiment = sentiments.includes(sentiment);
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return matchesSentiment;
    }
    return matchesSentiment && `${source} ${feedback}`.toLowerCase().includes(needle);
  });

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_10rem_minmax(20rem,auto)]">
          <label className="flex items-center gap-3 border border-[var(--ink)] bg-[var(--paper)] px-4">
            <SearchIcon />
            <input
              className="w-full bg-transparent py-3 outline-none"
              placeholder="Search feedback"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <BrandedSelect
            ariaLabel="Analytics date range"
            className="min-w-40"
            value={range}
            options={[
              { value: "24h", label: "Last 24h" },
              { value: "7d", label: "Last 7 days" },
            ]}
            onChange={setRange}
          />
          <div className="flex flex-wrap gap-2 border border-[var(--ink)] p-2">
            {(["positive", "neutral", "negative"] as const).map((sentiment) => {
              const isActive = sentiments.includes(sentiment);
              return (
                <button
                  key={sentiment}
                  type="button"
                  className={`border px-4 py-2 text-sm ${
                    isActive ? "border-[var(--ink)] bg-[var(--white)]" : "border-[var(--ink)]/30 opacity-55"
                  }`}
                  onClick={() =>
                    setSentiments((current) =>
                      current.includes(sentiment)
                        ? current.filter((item) => item !== sentiment)
                        : [...current, sentiment],
                    )
                  }
                >
                  {sentimentLabel(sentiment)}
                  <span className="ml-3" aria-hidden>×</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-label="More filters"
              className="flex items-center justify-center border border-[var(--ink)] px-3 py-2"
            >
              <DropdownChevron />
            </button>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-2">
          <AnalyticsSummaryCard
            title="Feedback received"
            value={ratedTotal.toLocaleString()}
            detail="Counted from feedback submissions for this skill."
          />
          <AnalyticsSummaryCard
            title="Positive rate"
            value={positiveRate}
            detail="Share of submitted ratings marked positive."
          />
          <AnalyticsSummaryCard
            title="Usage events"
            value={usageEvents.length.toLocaleString()}
            detail="Public page views, update checks, file loads, and feedback events."
          />
          <AnalyticsSummaryCard
            title="Update checks"
            value={(usageCounts.manifest_checked ?? 0).toLocaleString()}
            detail="Manifest reads from agents checking for the latest published version."
          />
        </section>

        <section className={`${DASHBOARD_CARD} overflow-hidden`}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-editorial-sans text-2xl font-semibold">Runtime events</h2>
            <p className="font-editorial-mono text-xs font-bold uppercase">
              {(usageCounts.file_loaded ?? 0).toLocaleString()} file loads
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="font-editorial-mono text-xs uppercase">
                <tr className="border-b border-[var(--ink)]">
                  <th className="px-5 py-4 font-bold">Time (UTC) ↓</th>
                  <th className="px-5 py-4 font-bold">Event</th>
                  <th className="px-5 py-4 font-bold">Source</th>
                  <th className="px-5 py-4 font-bold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--ink)]/65">
                      No runtime events yet.
                    </td>
                  </tr>
                ) : (
                  usageRows.map(({ rowKey, time, event, source, detail }) => (
                    <tr key={rowKey} className="border-b border-[var(--ink)]/45">
                      <td className="px-5 py-4">{time}</td>
                      <td className="px-5 py-4">{event}</td>
                      <td className="px-5 py-4">{source}</td>
                      <td className="px-5 py-4 font-editorial-mono text-xs">{detail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${DASHBOARD_CARD} overflow-hidden`}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-editorial-sans text-2xl font-semibold">Feedback</h2>
            <div className="flex gap-3">
              <label className="flex min-w-64 items-center gap-3 border border-[var(--ink)] px-4">
                <SearchIcon />
                <input
                  className="w-full bg-transparent py-3 outline-none"
                  placeholder="Search feedback"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                />
              </label>
              <button type="button" aria-label="Tune filters" className="border border-[var(--ink)] px-4">☷</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead className="font-editorial-mono text-xs uppercase">
                <tr className="border-b border-[var(--ink)]">
                  <th className="px-5 py-4 font-bold">Time (UTC) ↓</th>
                  <th className="px-5 py-4 font-bold">Sentiment</th>
                  <th className="px-5 py-4 font-bold">Agent / Source</th>
                  <th className="px-5 py-4 font-bold">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--ink)]/65">
                      No feedback yet.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(({ time, sentiment, source, feedback }) => (
                    <tr key={`${time}-${source}-${feedback}`} className="border-b border-[var(--ink)]/45">
                      <td className="px-5 py-4">{time}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-3">
                          <span
                            aria-hidden
                            className={`h-2.5 w-2.5 rounded-full ${
                              sentiment === "positive"
                                ? "bg-emerald-700"
                                : sentiment === "negative"
                                  ? "bg-red-600"
                                  : "bg-[var(--gray)]"
                            }`}
                          />
                          {sentimentLabel(sentiment)}
                        </span>
                      </td>
                      <td className="px-5 py-4">{source}</td>
                      <td className="px-5 py-4">{feedback}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {visibleRows.length} of {rows.length}</p>
          </div>
        </section>
      </section>
    </div>
  );
}
