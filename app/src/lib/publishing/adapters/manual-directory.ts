import type { PublishAdapter, PublishContext, PublishTargetKind } from "../types";

const manualTargets = new Set<PublishTargetKind>(["lobehub", "clawhub", "hermes"]);

export function createManualDirectoryAdapter(kind: PublishTargetKind): PublishAdapter {
  if (!manualTargets.has(kind)) {
    throw new Error(`unsupported manual directory target: ${kind}`);
  }

  return {
    kind,
    async validate() {
      return [];
    },
    async submit(context: PublishContext) {
      return {
        targetKind: kind,
        status: "manual_ready",
        packet: {
          target: kind,
          skill_id: context.skill.skillId,
          skill_name: context.skill.name,
          slug: context.skill.slug,
          version: context.version.version,
          files: context.files.map((file) => ({
            path: file.path,
            kind: file.kind,
            has_content: Boolean(file.contentText || file.contentBase64 || file.storageUrl),
          })),
        },
      };
    },
  };
}
