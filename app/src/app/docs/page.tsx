export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#0b0f17] px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <p className="text-sm uppercase tracking-wide text-slate-400">skillfully</p>
        <h1 className="text-3xl font-bold">Docs</h1>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-slate-300">
            Sign in with email magic-code, create a skill, and add the generated snippet
            to your implementation. Feedback is read only by the signed-in owner.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Auth</h2>
          <p className="text-sm text-slate-400">
            Built-in InstantDB auth. Enter your email to receive a one-time code.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Feedback endpoint</h2>
          <p className="text-sm text-slate-400">POST /feedback/{`{skillId}`}</p>
          <pre className="rounded border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
{`{
  "rating": "positive" | "negative" | "neutral",
  "feedback": "What happened in this run"
}`}
          </pre>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Example</h2>
          <pre className="rounded border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
{`curl -X POST https://skillfully.sh/feedback/sk_abc123de \
  -H "Content-Type: application/json" \
  -d '{ "rating": "positive", "feedback": "User accepted recommendation quickly" }'`}
          </pre>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Response behavior</h2>
          <ul className="list-disc space-y-1 pl-6 text-sm text-slate-300">
            <li>201: feedback accepted</li>
            <li>400: invalid payload</li>
            <li>404: unknown skill id</li>
            <li>429: rate limit hit (max 30 requests/minute per IP)</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
