# A/B Test Dev Overlay

## Decision

Local development uses a bottom-right A/B test overlay for manually switching experiment variants. The overlay is gated to the development runtime and is not rendered in production builds.

The landing onboarding experiment still assigns visitors automatically through PostHog on `/`. Manual URL overrides such as `?landing=control` or `?landing=agent-first` are not supported.

## Mandatory Experiment Rule

EVERY A/B test must be added to the A/B test overlay before or alongside launch. Add the experiment to `app/src/lib/ab-test-registry.ts` so the local dev overlay can switch every active variant without adding route-specific or query-param override code.

## Current Overlay Entry

- Experiment: `landing_agent_first_onboarding`
- Variants: `control`, `agent_first`
- Production route: `/`

## PostHog Assignment Contract

- Production assignment is bootstrapped by `@posthog/next` in the `/` server wrapper at `app/src/app/page.tsx` with `bootstrapFlags` for `landing_agent_first_onboarding`.
- `app/src/proxy.ts` seeds the standard PostHog identity cookie so server-side flag evaluation and browser-side hooks use the same distinct ID. It must not contain variant-routing logic.
- `app/src/app/landing-page-client.tsx` still uses `useFeatureFlagVariantKey` from `@posthog/react` for the landing decision, reading the bootstrapped flag value on first render.
- `agent_first` renders the agent-first landing experience. Any other loaded value, including `control`, renders the regular landing page.
- The dev overlay uses `posthog.featureFlags.overrideFeatureFlags({ flags: { landing_agent_first_onboarding: value } })` for local testing.
- The `auto` overlay action clears local PostHog feature-flag overrides with `posthog.featureFlags.overrideFeatureFlags(false)`.

## Testing Expectations

- The green `dev` button appears only when running the app with `next dev`.
- Opening the overlay exposes each registered A/B test and its variants.
- Choosing a variant overrides that PostHog feature flag locally without query params or variant cookies.
- Choosing `auto` clears local PostHog feature-flag overrides so the automatic assignment path can run again.
- `/agent-first` must not be reintroduced as a standalone route for the landing onboarding experiment.
