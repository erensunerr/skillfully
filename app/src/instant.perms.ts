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
  $files: {
    allow: {
      view: "auth.id != null && data.path.startsWith('skills/')",
      create: "auth.id != null && data.path.startsWith('skills/')",
      update: "auth.id != null && data.path.startsWith('skills/')",
      delete: "auth.id != null && data.path.startsWith('skills/')",
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
  apiLoginAttempts: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  agentDeviceCodes: {
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
      update: "data.ownerId == auth.id",
      delete: "false",
    },
  },
  skillVersions: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "data.ownerId == auth.id",
      update: "data.ownerId == auth.id",
      delete: "false",
    },
  },
  skillFiles: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "data.ownerId == auth.id",
      update: "data.ownerId == auth.id",
      delete: "data.ownerId == auth.id",
    },
  },
  publishingTargets: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "data.ownerId == auth.id",
      update: "data.ownerId == auth.id",
      delete: "false",
    },
  },
  publishRuns: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  directorySubmissions: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  skillUsageEvents: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  githubInstallations: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  githubRepositories: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  skillImports: {
    allow: {
      view: "data.ownerId == auth.id",
      create: "false",
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
