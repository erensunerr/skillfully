import type { NextRequest } from "next/server";

import { ApiError, getBearerToken, resolveTokenOwner } from "@/lib/agent-api";
import {
  skillfullyFeedbackUrl,
  skillfullyFileUrl,
  skillfullyManifestUrl,
} from "@/lib/skills/skill-files";
import type {
  PublishingTargetRow,
  SkillFileRow,
  SkillRow,
  SkillVersionRow,
} from "@/lib/skills/repository";

export type AgentAuthor = {
  ownerId: string;
};

export async function getAgentAuthor(request: NextRequest): Promise<AgentAuthor | null> {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return null;
  }

  try {
    const owner = await resolveTokenOwner(token);
    return { ownerId: owner.userId };
  } catch {
    return null;
  }
}

export async function requireAgentAuthor(request: NextRequest): Promise<AgentAuthor> {
  const author = await getAgentAuthor(request);
  if (!author) {
    throw new ApiError(401, "missing or invalid Authorization: Bearer <token>");
  }
  return author;
}

export function buildAgentSkillLinks({
  skillId,
  baseUrl,
}: {
  skillId: string;
  baseUrl: string;
}) {
  return {
    feedback_url: skillfullyFeedbackUrl({ skillId, baseUrl }),
    manifest_url: skillfullyManifestUrl({ skillId, baseUrl }),
    skill_file_url: skillfullyFileUrl({ skillId, path: "SKILL.md", baseUrl }),
    public_skill_url: `${baseUrl.replace(/\/+$/, "")}/skills/${skillId}`,
  };
}

export function serializeAgentSkill({
  skill,
  version,
  files,
  targets,
  baseUrl,
}: {
  skill: SkillRow;
  version?: SkillVersionRow | null;
  files?: SkillFileRow[];
  targets?: PublishingTargetRow[];
  baseUrl: string;
}) {
  return {
    id: skill.id,
    skill_id: skill.skillId,
    name: skill.name,
    description: skill.description ?? null,
    slug: skill.slug,
    status: skill.status,
    visibility: skill.visibility,
    source_mode: skill.sourceMode,
    original_repo_full_name: skill.originalRepoFullName ?? null,
    original_skill_path: skill.originalSkillPath ?? null,
    current_draft_version_id: skill.currentDraftVersionId,
    published_version_id: skill.publishedVersionId ?? null,
    created_at: skill.createdAt,
    updated_at: skill.updatedAt,
    links: buildAgentSkillLinks({ skillId: skill.skillId, baseUrl }),
    ...(version
      ? {
          draft_version: {
            id: version.id,
            version: version.version,
            status: version.status,
            summary: version.summary ?? null,
            created_at: version.createdAt,
            updated_at: version.updatedAt,
          },
        }
      : {}),
    ...(files
      ? {
          files: files.map((file) => ({
            id: file.id,
            path: file.path,
            kind: file.kind,
            mime_type: file.mimeType ?? null,
            size: file.size ?? null,
            sha256: file.sha256 ?? null,
            content_text: file.contentText ?? null,
            storage_url: file.storageUrl ?? null,
            updated_at: file.updatedAt,
          })),
        }
      : {}),
    ...(targets
      ? {
          publishing_targets: targets.map((target) => ({
            id: target.id,
            target_kind: target.targetKind,
            status: target.status,
            repo_full_name: target.repoFullName ?? null,
            skill_root: target.skillRoot ?? null,
            base_branch: target.baseBranch ?? null,
            auto_merge: target.autoMerge ?? false,
            consent_status: target.consentStatus ?? null,
            updated_at: target.updatedAt,
          })),
        }
      : {}),
  };
}
