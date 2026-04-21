// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    apiLoginCodes: i.entity({
      userId: i.string().indexed(),
      email: i.string().indexed(),
      codeHash: i.string(),
      codeLength: i.number(),
      expiresAt: i.number().indexed(),
      consumedAt: i.number().optional(),
      createdAt: i.number().indexed(),
    }),
    apiTokens: i.entity({
      userId: i.string().indexed(),
      tokenHash: i.string().indexed(),
      tokenPrefix: i.string().indexed(),
      expiresAt: i.number().indexed(),
      createdAt: i.number().indexed(),
    }),
    apiUsers: i.entity({
      email: i.string().unique().indexed(),
      createdAt: i.number(),
      lastLoginCodeSentAt: i.number().optional(),
    }),
    skills: i.entity({
      ownerId: i.string().indexed(),
      name: i.string(),
      description: i.string().optional(),
      skillId: i.string().unique().indexed(),
      createdAt: i.number().indexed(),
    }),
    feedback: i.entity({
      ownerId: i.string().indexed(),
      skillId: i.string().indexed(),
      rating: i.string().indexed(),
      feedback: i.string(),
      ipHash: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
  },
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
