import {
  AGENT_FIRST_EXPERIMENT_FLAG_KEY,
  AGENT_FIRST_VARIANT_FLAG_VALUE,
} from "@/lib/landing-experiment";

export type ABTestVariant = {
  value: string;
  label: string;
};

export type ABTestDefinition = {
  key: string;
  label: string;
  variants: readonly ABTestVariant[];
};

export const AB_TEST_DEFINITIONS = [
  {
    key: AGENT_FIRST_EXPERIMENT_FLAG_KEY,
    label: "Landing onboarding",
    variants: [
      { value: "control", label: "Control" },
      { value: AGENT_FIRST_VARIANT_FLAG_VALUE, label: "Agent first" },
    ],
  },
] as const satisfies readonly ABTestDefinition[];
