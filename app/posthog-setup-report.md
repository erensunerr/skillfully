<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Skillfully Next.js App Router application. PostHog is initialized via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), with a reverse proxy configured in `next.config.ts` to improve reliability. A server-side PostHog client (`src/lib/posthog-server.ts`) handles event capture from API routes. User identification is performed on sign-in using the InstantDB user ID as the distinct ID, and `posthog.reset()` is called on sign-out. Exception capture is enabled globally via `capture_exceptions: true`.

| Event | Description | File |
|---|---|---|
| `auth_email_submitted` | User submitted their email to request a magic code login | `src/app/dashboard/page.tsx` |
| `auth_code_verified` | User successfully verified their magic code and signed in (+ `posthog.identify`) | `src/app/dashboard/page.tsx` |
| `user_signed_out` | User signed out of their account (+ `posthog.reset`) | `src/app/dashboard/page.tsx` |
| `skill_created` | User created a new skill with a name and optional description | `src/app/dashboard/page.tsx` |
| `skill_selected` | User selected a skill from the list to view its detail | `src/app/dashboard/page.tsx` |
| `snippet_copied` | User copied the skill snippet to clipboard from the detail view | `src/app/dashboard/page.tsx` |
| `feedback_load_more_clicked` | User clicked "Load more" to see additional feedback entries | `src/app/dashboard/page.tsx` |
| `feedback_received` | Agent posted feedback for a skill via the API endpoint (server-side) | `src/app/feedback/[skillId]/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard** — [Analytics basics](https://us.posthog.com/project/381355/dashboard/1464257)
- **Sign-up conversion funnel** — [Email submitted → Code verified](https://us.posthog.com/project/381355/insights/fakp4Grp)
- **Skills created over time** — [Daily skill creation trend](https://us.posthog.com/project/381355/insights/dpp9p6MI)
- **Snippet copies over time** — [Integration adoption proxy](https://us.posthog.com/project/381355/insights/1LdOq0Yg)
- **Feedback received by rating** — [Positive/negative/neutral breakdown](https://us.posthog.com/project/381355/insights/kMj2jsKZ)
- **User sign-outs (churn signal)** — [Daily churn indicator](https://us.posthog.com/project/381355/insights/ZWlYsZzf)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
