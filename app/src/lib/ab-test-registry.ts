import {
  AGENT_FIRST_EXPERIMENT_FLAG_KEY,
  AGENT_FIRST_VARIANT_FLAG_VALUE,
  LANDING_VARIANT_COOKIE,
  type LandingVariant,
} from "@/lib/landing-experiment";

export type ABTestVariant = {
  value: string;
  label: string;
  posthogValue?: string;
};

export type ABTestDefinition = {
  key: string;
  label: string;
  cookieName: string;
  variants: readonly ABTestVariant[];
};

export const AB_TEST_DEFINITIONS = [
  {
    key: AGENT_FIRST_EXPERIMENT_FLAG_KEY,
    label: "Landing onboarding",
    cookieName: LANDING_VARIANT_COOKIE,
    variants: [
      { value: "control", label: "Control", posthogValue: "control" },
      { value: "agent-first", label: "Agent first", posthogValue: AGENT_FIRST_VARIANT_FLAG_VALUE },
    ] satisfies readonly (ABTestVariant & { value: LandingVariant })[],
  },
] as const satisfies readonly ABTestDefinition[];
