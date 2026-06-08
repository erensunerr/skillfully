"use client";

import type { Feedback, RecentFeedbackRow, Skill, SkillUsageEvent } from "./dashboard-model";
import { DASHBOARD_CARD, formatTimestamp, pluralCount, publishingDestinationRowsForSkill, ratingSummary, skillVisibility, toMillis, usageEventLabel, usageEventsByDay, usageSummary } from "./dashboard-model";
import { TargetIcon } from "./dashboard-icons";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">{label}</p>
      <div className="mt-8 font-editorial-sans text-5xl font-semibold sm:text-6xl">
        {value}
      </div>
      <p className="mt-4 font-editorial-sans text-base text-[var(--ink)]/70">{detail}</p>
    </article>
  );
}

export function UsageChart({ events }: { events: SkillUsageEvent[] }) {
  const buckets = usageEventsByDay(events);
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const counts = usageSummary(events);
  const total = events.length;

  return (
    <section className={`${DASHBOARD_CARD} p-6 sm:p-8`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-editorial-mono text-xs font-bold uppercase">Usage over time</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--ink)]/70">
            Recorded from public page views, manifest update checks, file loads, and feedback submissions.
          </p>
        </div>
        <div className="border border-[var(--ink)] bg-[var(--white)] px-4 py-3 text-right">
          <p className="font-editorial-mono text-[0.62rem] font-bold uppercase">Total events</p>
          <p className="font-editorial-sans text-3xl font-semibold">{total.toLocaleString()}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-8 flex min-h-64 items-center justify-center border border-dashed border-[var(--ink)]/40 bg-[var(--white)] p-8 text-center">
          <div>
            <p className="font-editorial-sans text-xl font-semibold">No usage data yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ink)]/65">
              This chart will populate after Skillfully records public skill page views, update checks, file loads, or feedback events.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="flex min-h-64 items-end gap-3 border border-[var(--ink)] bg-[var(--white)] p-5">
            {buckets.map((bucket) => (
              <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                <div className="flex h-44 w-full items-end border-x border-[var(--ink)]/15 px-1">
                  <div
                    className="w-full bg-[var(--ink)]"
                    style={{ height: `${Math.max(6, (bucket.count / maxCount) * 100)}%` }}
                    aria-label={`${bucket.label}: ${bucket.count} usage events`}
                  />
                </div>
                <span className="font-editorial-mono text-[0.62rem] uppercase">{bucket.label}</span>
              </div>
            ))}
          </div>
          <div className="border border-[var(--ink)] bg-[var(--white)] p-5">
            <p className="font-editorial-mono text-xs font-bold uppercase">Event mix</p>
            <div className="mt-5 space-y-4 text-sm">
              {(["public_page_view", "skill_installed", "manifest_checked", "file_loaded", "feedback_received"] as const).map((kind) => (
                <div key={kind} className="flex items-center justify-between gap-4">
                  <span>{usageEventLabel(kind)}</span>
                  <span className="font-editorial-mono">{(counts[kind] ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function SentimentPanel({ entries }: { entries: Feedback[] }) {
  const counts = ratingSummary(entries);
  const total = counts.positive + counts.neutral + counts.negative;
  const percentages =
    total > 0
      ? {
          positive: Math.round((counts.positive / total) * 100),
          neutral: Math.round((counts.neutral / total) * 100),
          negative: Math.round((counts.negative / total) * 100),
        }
      : {
          positive: 0,
          neutral: 0,
          negative: 0,
        };

  return (
    <section className={`${DASHBOARD_CARD} p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">
        Feedback sentiment <span className="ml-2 font-normal">(last 30 days)</span>
      </p>
      <div className="mt-7 space-y-7">
        {[
          ["Positive", percentages.positive, "bg-emerald-700"],
          ["Neutral", percentages.neutral, "bg-[var(--gray)]"],
          ["Negative", percentages.negative, "bg-red-600"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-5">
            <div className="flex items-center gap-3">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${color}`} />
              <span className="text-sm">{label}</span>
            </div>
            <div className="h-2 bg-[var(--ink)]/10">
              <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
            </div>
            <span className="text-right text-sm">{value}%</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-between border-t border-[var(--ink)] pt-5 text-sm">
        <span>Total</span>
        <span>{total === 1 ? "1 feedback" : `${total} feedback`}</span>
      </div>
      {total === 0 ? (
        <p className="mt-4 border border-dashed border-[var(--ink)]/35 bg-[var(--white)] p-4 text-sm text-[var(--ink)]/70">
          No feedback yet.
        </p>
      ) : null}
    </section>
  );
}

export function feedbackRowsFromEntries(entries: Feedback[]) {
  return [...entries]
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .slice(0, 5)
    .map((entry): RecentFeedbackRow => {
      const sentiment =
        entry.rating === "negative" ? "negative" : entry.rating === "neutral" ? "neutral" : "positive";

      return {
        sentiment,
        rating: sentiment === "positive" ? "5/5" : sentiment === "neutral" ? "3/5" : "1/5",
        feedback: entry.feedback,
        createdAt: formatTimestamp(entry.createdAt),
      };
    });
}

export function SentimentBadge({ sentiment }: { sentiment: RecentFeedbackRow["sentiment"] }) {
  const classes = {
    positive: "border-emerald-700 bg-emerald-50 text-emerald-800",
    neutral: "border-[var(--gray)] bg-[var(--white)] text-[var(--ink)]",
    negative: "border-red-600 bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex border px-2 py-1 font-editorial-sans text-xs ${classes[sentiment]}`}>
      {sentiment[0].toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

export function sentimentLabel(sentiment: RecentFeedbackRow["sentiment"]) {
  return sentiment[0].toUpperCase() + sentiment.slice(1);
}

export function RecentFeedbackTable({ entries }: { entries: Feedback[] }) {
  const rows = feedbackRowsFromEntries(entries);

  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="p-6 pb-3">
        <p className="font-editorial-mono text-xs font-bold uppercase">Recent feedback</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="font-editorial-mono text-xs uppercase">
            <tr className="border-b border-[var(--ink)]/25">
              <th className="px-6 py-4 font-bold">Sentiment</th>
              <th className="px-4 py-4 font-bold">Rating</th>
              <th className="px-4 py-4 font-bold">Feedback</th>
              <th className="px-6 py-4 text-right font-bold">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--ink)]/65">
                  No feedback yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.feedback}-${index}`} className="border-b border-[var(--ink)]/20 last:border-b-0">
                  <td className="px-6 py-4">
                    <SentimentBadge sentiment={row.sentiment} />
                  </td>
                  <td className="px-4 py-4 font-editorial-sans font-semibold">{row.rating}</td>
                  <td className="px-4 py-4">{row.feedback}</td>
                  <td className="px-6 py-4 text-right font-editorial-mono text-xs">{row.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button type="button" className="flex w-full items-center justify-between border-t border-[var(--ink)] px-6 py-4 text-left text-sm font-semibold">
        View all feedback
        <span aria-hidden className="text-2xl">›</span>
      </button>
    </section>
  );
}

export function PublishingStatus({ skill }: { skill: Skill }) {
  const destinationRows = publishingDestinationRowsForSkill(skill);

  return (
    <section className={`${DASHBOARD_CARD} p-6`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">Publishing & directory status</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {destinationRows.map(([name, status, detail, icon], index) => (
          <article key={name} className={`space-y-4 ${index > 0 ? "xl:border-l xl:border-[var(--ink)]/25 xl:pl-6" : ""}`}>
            <TargetIcon name={icon} />
            <div className="font-editorial-sans text-base">{name}</div>
            <div className="flex items-center gap-2 text-sm">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[var(--gray)]" />
              {status}
            </div>
            <div className="font-editorial-mono text-sm leading-5">{detail}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function VersionSnapshot({ skill }: { skill: Skill }) {
  const rows = [
    skill.publishedVersionId
      ? [
          "Published version",
          "Published",
          skillVisibility(skill) === "private" && skill.anyoneWithLinkCanUse === true
            ? "A frozen version is available to anyone with the link"
            : skillVisibility(skill) === "private"
            ? "A frozen version is available to people with use or edit access"
            : "A frozen version is available for public installs",
        ]
      : null,
    skill.currentDraftVersionId
      ? ["Current draft", "Draft", "Editable files are saved in the draft version"]
      : null,
  ].filter(Boolean) as Array<[string, string, string]>;

  return (
    <section className={`${DASHBOARD_CARD} overflow-hidden`}>
      <div className="p-6 pb-3">
        <p className="font-editorial-mono text-xs font-bold uppercase">Version snapshot</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="font-editorial-mono text-xs uppercase">
            <tr className="border-b border-[var(--ink)]/25">
              <th className="px-6 py-4 font-bold">Record</th>
              <th className="px-4 py-4 font-bold">Status</th>
              <th className="px-4 py-4 font-bold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-[var(--ink)]/65">
                  No published versions yet.
                </td>
              </tr>
            ) : (
              rows.map(([record, status, notes]) => (
                <tr key={record} className="border-b border-[var(--ink)]/20 last:border-b-0">
                  <td className="px-6 py-4 font-editorial-mono text-xs">{record}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-editorial-mono text-xs leading-5">{notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
