import type { PublishAdapter } from "../types";

export function createSkillfullyAdapter(): PublishAdapter {
  return {
    kind: "skillfully",
    async validate() {
      return [];
    },
    async submit(context) {
      return {
        targetKind: "skillfully",
        status: "published",
        details: {
          storage: "skillfully",
          skillId: context.skill.skillId,
          versionId: context.version.id,
        },
      };
    },
  };
}
