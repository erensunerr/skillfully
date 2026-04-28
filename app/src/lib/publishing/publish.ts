import type { PublishAdapter, PublishContext, PublishResult } from "./types";

export async function publishSkillVersion({
  context,
  adapters,
  recordResult,
}: {
  context: PublishContext;
  adapters: PublishAdapter[];
  recordResult?: (result: PublishResult) => Promise<void>;
}) {
  const results: PublishResult[] = [];

  for (const adapter of adapters) {
    const issues = await adapter.validate(context);
    const blockingIssue = issues.find((issue) => issue.severity === "error");

    if (blockingIssue) {
      const failed: PublishResult = {
        targetKind: adapter.kind,
        status: "failed",
        error: blockingIssue.message,
      };
      results.push(failed);
      await recordResult?.(failed);
      continue;
    }

    try {
      const result = await adapter.submit(context);
      results.push(result);
      await recordResult?.(result);
    } catch (error) {
      const failed: PublishResult = {
        targetKind: adapter.kind,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown publish error",
      };
      results.push(failed);
      await recordResult?.(failed);
    }
  }

  return { results };
}
