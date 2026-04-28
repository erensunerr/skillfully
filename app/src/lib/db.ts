import { init } from "@instantdb/react";
import { useSyncExternalStore } from "react";
import schema from "../instant.schema";

const instantAppId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const localPreviewAppId = "00000000-0000-0000-0000-000000000000";
const shouldUseLocalPreviewDb =
  !instantAppId && process.env.NODE_ENV !== "production";

const instantDb = init({
  appId: instantAppId || localPreviewAppId,
  schema,
  useDateObjects: true,
});

type SkillfullyDb = typeof instantDb;
type LocalSkill = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  skillId: string;
  createdAt: number;
};

type LocalFeedback = {
  id: string;
  ownerId: string;
  skillId: string;
  rating: string;
  feedback: string;
  createdAt: number;
};

type LocalCreateOp = {
  entity: "skills";
  id: string;
  values: Omit<LocalSkill, "id">;
};

const localPreviewUser = {
  id: "local-preview-user",
  email: "preview@skillfully.local",
};

function createLocalPreviewDb(): SkillfullyDb {
  const listeners = new Set<() => void>();
  let snapshot = {
    skills: [] as LocalSkill[],
    feedback: [] as LocalFeedback[],
  };

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  const localDb = {
    useAuth() {
      return {
        isLoading: false,
        user: localPreviewUser,
        error: null,
      };
    },
    useQuery() {
      const currentSnapshot = useSyncExternalStore(
        subscribe,
        () => snapshot,
        () => snapshot,
      );

      return {
        isLoading: false,
        error: null,
        data: currentSnapshot,
      };
    },
    auth: {
      async sendMagicCode() {
        return undefined;
      },
      async signInWithMagicCode() {
        return { user: localPreviewUser };
      },
      async signOut() {
        snapshot = {
          skills: [],
          feedback: [],
        };
        emit();
      },
    },
    tx: {
      skills: new Proxy(
        {},
        {
          get(_target, entityId: string) {
            return {
              create(values: Omit<LocalSkill, "id">): LocalCreateOp {
                return {
                  entity: "skills",
                  id: entityId,
                  values,
                };
              },
            };
          },
        },
      ),
    },
    transact(op: LocalCreateOp | LocalCreateOp[]) {
      const ops = Array.isArray(op) ? op : [op];

      ops.forEach((currentOp) => {
        if (currentOp.entity !== "skills") {
          return;
        }

        snapshot = {
          ...snapshot,
          skills: [
            {
              id: currentOp.id,
              ...currentOp.values,
            },
            ...snapshot.skills,
          ],
        };
      });

      emit();
    },
  };

  return localDb as unknown as SkillfullyDb;
}

export const isUsingLocalPreviewDb = shouldUseLocalPreviewDb;
export const db = shouldUseLocalPreviewDb ? createLocalPreviewDb() : instantDb;
