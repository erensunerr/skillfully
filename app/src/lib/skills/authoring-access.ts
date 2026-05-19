import {
  requireSkillEditAccess,
  requireSkillUseAccess,
} from "@/lib/skills/access";
import { defaultSkillStore, type SkillRow, type SkillStore } from "@/lib/skills/repository";

let testStore: SkillStore | null = null;

export function setSkillAuthoringTestStore(store: SkillStore | null) {
  testStore = store;
}

export function getSkillAuthoringStore() {
  return testStore ?? defaultSkillStore;
}

export type SkillAuthoringContext = {
  store: SkillStore;
  skill: SkillRow;
  ownerId: string;
};

export async function requireSkillEditContext({
  userId,
  email,
  skillId,
}: {
  userId: string;
  email?: string | null;
  skillId: string;
}): Promise<SkillAuthoringContext> {
  const store = getSkillAuthoringStore();
  const access = await requireSkillEditAccess({ store, skillId, userId, email });
  if (!access.skill) {
    throw new Error("skill not found");
  }
  return {
    store,
    skill: access.skill,
    ownerId: access.skill.ownerId,
  };
}

export async function requireSkillUseContext({
  userId,
  email,
  skillId,
}: {
  userId: string;
  email?: string | null;
  skillId: string;
}): Promise<SkillAuthoringContext> {
  const store = getSkillAuthoringStore();
  const access = await requireSkillUseAccess({ store, skillId, userId, email });
  if (!access.skill) {
    throw new Error("skill not found");
  }
  return {
    store,
    skill: access.skill,
    ownerId: access.skill.ownerId,
  };
}
