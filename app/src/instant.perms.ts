// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  $users: {
    allow: {
      view: "data.id == auth.id",
      create: "true",
      update: "false",
      delete: "false",
    },
  },
  apiLoginCodes: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  apiTokens: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  apiUsers: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  skills: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "data.ownerId == auth.id",
      update: "false",
      delete: "false",
    },
  },
  feedback: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
