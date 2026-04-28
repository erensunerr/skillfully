export type PublishTargetKind = "github" | "lobehub" | "clawhub" | "hermes" | "skillfully";
export type PublishResultStatus = "published" | "submitted" | "manual_ready" | "failed";

export type PublishFile = {
  path: string;
  kind: string;
  contentText?: string | null;
  contentBase64?: string | null;
  storageUrl?: string | null;
};

export type PublishContext = {
  skill: {
    skillId: string;
    slug: string;
    name: string;
    sourceMode?: string | null;
    originalSkillPath?: string | null;
  };
  version: {
    id: string;
    version: string;
  };
  files: PublishFile[];
  defaultGitHubRepo?: {
    repoFullName: string;
    installationId: string;
    baseBranch?: string | null;
  } | null;
  githubTarget?: {
    repoFullName: string;
    installationId: string;
    skillRoot?: string | null;
    baseBranch?: string | null;
    autoMerge?: boolean | null;
  } | null;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
};

export type PublishResult = {
  targetKind: PublishTargetKind;
  status: PublishResultStatus;
  url?: string;
  error?: string;
  packet?: Record<string, unknown>;
  details?: Record<string, unknown>;
};

export type PublishAdapter = {
  kind: PublishTargetKind;
  validate(context: PublishContext): Promise<ValidationIssue[]>;
  submit(context: PublishContext): Promise<PublishResult>;
};
