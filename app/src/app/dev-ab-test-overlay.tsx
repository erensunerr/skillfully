"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

import { AB_TEST_DEFINITIONS, type ABTestDefinition } from "@/lib/ab-test-registry";

type OverrideSelections = Record<string, string | null>;

function defaultOverrideSelections() {
  return Object.fromEntries(AB_TEST_DEFINITIONS.map((test) => [test.key, null]));
}

function applyFeatureFlagOverrides(selections: OverrideSelections) {
  const activeOverrideFlags = Object.fromEntries(
    Object.entries(selections).filter((entry): entry is [string, string] => entry[1] !== null),
  );

  if (Object.keys(activeOverrideFlags).length > 0) {
    posthog.featureFlags.overrideFeatureFlags({ flags: activeOverrideFlags });
  } else {
    posthog.featureFlags.overrideFeatureFlags(false);
  }
}

export function DevABTestOverlay({
  enabled = process.env.NODE_ENV === "development",
  defaultOpen = false,
  resolvedVariants = {},
}: {
  enabled?: boolean;
  defaultOpen?: boolean;
  resolvedVariants?: Record<string, string | boolean | undefined>;
} = {}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [overrideSelections, setOverrideSelections] = useState<OverrideSelections>(() => defaultOverrideSelections());

  useEffect(() => {
    if (enabled) {
      posthog.featureFlags.overrideFeatureFlags(false);
    }
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  function updateFeatureFlagOverride(key: string, value: string | null) {
    const nextSelections = { ...overrideSelections, [key]: value };

    setOverrideSelections(nextSelections);
    applyFeatureFlagOverrides(nextSelections);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 font-editorial-mono text-xs">
      {isOpen ? (
        <section className="w-[min(22rem,calc(100vw-2rem))] border border-[#0b5f2a] bg-[#f7fff9] text-[#063016] shadow-[4px_4px_0_rgba(6,48,22,0.35)]">
          <header className="flex items-center justify-between border-b border-[#0b5f2a] px-3 py-2">
            <div>
              <p className="font-bold uppercase">A/B test overlay</p>
              <p className="mt-1 text-[0.65rem] text-[#3a6b49]">Local development only</p>
            </div>
            <button
              type="button"
              className="border border-[#0b5f2a] px-2 py-1 font-bold uppercase hover:bg-[#d7f8df]"
              onClick={() => setIsOpen(false)}
            >
              close
            </button>
          </header>
          <div className="space-y-4 p-3">
            {AB_TEST_DEFINITIONS.map((test) => {
              return (
                <DevABTestFlagControls
                  key={test.key}
                  test={test}
                  resolvedVariant={resolvedVariants[test.key]}
                  overrideSelection={overrideSelections[test.key] ?? null}
                  onOverrideChange={updateFeatureFlagOverride}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="grid h-12 w-12 place-items-center border border-[#063016] bg-[#0bb84f] font-bold lowercase text-[#031609] shadow-[3px_3px_0_rgba(6,48,22,0.45)] hover:bg-[#22d465] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#063016]"
        onClick={() => setIsOpen((current) => !current)}
      >
        dev
      </button>
    </div>
  );
}

function DevABTestFlagControls({
  test,
  resolvedVariant,
  overrideSelection,
  onOverrideChange,
}: {
  test: ABTestDefinition;
  resolvedVariant: string | boolean | undefined;
  overrideSelection: string | null;
  onOverrideChange: (key: string, value: string | null) => void;
}) {
  const resolvedVariantLabel = resolvedVariant === undefined ? "loading" : String(resolvedVariant);

  return (
    <div className="space-y-2">
      <div>
        <p className="font-bold">{test.label}</p>
        <p className="mt-1 break-all text-[0.65rem] text-[#3a6b49]">{test.key}</p>
        <p className="mt-1 text-[0.65rem] text-[#3a6b49]">resolved: {resolvedVariantLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {test.variants.map((variant) => {
          const isActive = overrideSelection === variant.value;

          return (
            <button
              key={variant.value}
              type="button"
              aria-pressed={isActive}
              className={[
                "border px-3 py-2 font-bold uppercase",
                isActive
                  ? "border-[#063016] bg-[#0bb84f] text-[#031609]"
                  : "border-[#0b5f2a] bg-white text-[#063016] hover:bg-[#d7f8df]",
              ].join(" ")}
              onClick={() => onOverrideChange(test.key, variant.value)}
            >
              <span className="block">{variant.label}</span>
              <span className="mt-1 block text-[0.62rem] lowercase opacity-70">{variant.value}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={overrideSelection === null}
          className={[
            "border px-3 py-2 font-bold uppercase",
            overrideSelection === null
              ? "border-[#063016] bg-[#0bb84f] text-[#031609]"
              : "border-[#0b5f2a] bg-white text-[#063016] hover:bg-[#d7f8df]",
          ].join(" ")}
          onClick={() => onOverrideChange(test.key, null)}
        >
          auto
        </button>
      </div>
    </div>
  );
}
