# A/B Test Dev Overlay

## Decision

Local development uses a bottom-right A/B test overlay for manually switching experiment variants. The overlay is gated to the development runtime and is not rendered in production builds.

The landing onboarding experiment still assigns visitors automatically through PostHog on `/`. Manual URL overrides such as `?landing=control` or `?landing=agent-first` are not supported.

## Mandatory Experiment Rule

EVERY A/B test must be added to the A/B test overlay before or alongside launch. Add the experiment to `app/src/lib/ab-test-registry.ts` so the local dev overlay can switch every active variant without adding route-specific or query-param override code.

## Current Overlay Entry

- Experiment: `landing_agent_first_onboarding`
- Cookie: `skillfully_landing_variant`
- Variants: `control`, `agent-first`
- Production route: `/`

## PostHog Assignment Contract

- Production assignment happens in `app/src/proxy.ts` before `/` renders.
- The proxy calls PostHog `/flags/?v=2` with `token` and `distinct_id` only. Do not send `api_key` to this endpoint.
- The current `/flags/?v=2` response returns flag objects under `flags`, with the experiment assignment in `flags.landing_agent_first_onboarding.variant`.
- The proxy must keep accepting older raw values from `featureFlags` or `flags` for testability and backwards compatibility.

## Testing Expectations

- The green `dev` button appears only when running the app with `next dev`.
- Opening the overlay exposes each registered A/B test and its variants.
- Choosing a variant sets that test's local cookie and reloads the page.
- Choosing `auto` clears the local cookie so the automatic assignment path can run again.
- `/agent-first` must not be reintroduced as a standalone route for the landing onboarding experiment.
