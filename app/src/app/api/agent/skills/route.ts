import crypto from "node:crypto";
import { NextRequest } from "next/server";

import { ApiError } from "@/lib/agent-api";
import { requireAgentAuthor, serializeAgentSkill } from "@/lib/agent-author-api";
import { getErrorPayload, jsonResponse } from "@/lib/route-helpers";
import {
  createSkillDraft,
  listSkillFiles,
  listPublishingTargets,
  listSkillsForOwner,
} from "@/lib/skills/repository";

const SKILL_ID_CHARS = "abcdefghijkmnopqrstuvwxyz23456789";

function randomSkillId() {
  let out = "sk_";
  for (let index = 0; index < 10; index += 1) {
    out += SKILL_ID_CHARS[crypto.randomInt(0, SKILL_ID_CHARS.length)];
  }
  return out;
}

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}

export async function GET(request: NextRequest) {
  try {
    const author = await requireAgentAuthor(request);
    const baseUrl = new URL(request.url).origin;
    const skills = await listSkillsForOwner({ ownerId: author.ownerId });

    return jsonResponse(
      {
        skills: skills.map((skill) => serializeAgentSkill({ skill, baseUrl })),
      },
      200,
      "GET, POST, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, POST, OPTIONS");
  }
}

export async function POST(request: NextRequest) {
  try {
    const author = await requireAgentAuthor(request);
    let body: {
      name?: unknown;
      description?: unknown;
      source_mode?: unknown;
      original_repo_full_name?: unknown;
      original_skill_path?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid json body" }, 400, "GET, POST, OPTIONS");
    }

    const baseUrl = new URL(request.url).origin;
    const created = await createSkillDraft({
      ownerId: author.ownerId,
      name: String(body.name ?? ""),
      description: body.description === undefined ? undefined : String(body.description),
      baseUrl,
      skillIdGenerator: randomSkillId,
      sourceMode: body.source_mode ? String(body.source_mode) : "managed",
      originalRepoFullName: body.original_repo_full_name ? String(body.original_repo_full_name) : undefined,
      originalSkillPath: body.original_skill_path ? String(body.original_skill_path) : undefined,
    });
    const files = await listSkillFiles({
      ownerId: author.ownerId,
      skillId: created.skill.skillId,
      versionId: created.version.id,
    });
    const targets = await listPublishingTargets({
      ownerId: author.ownerId,
      skillId: created.skill.skillId,
    });

    return jsonResponse(
      {
        skill: serializeAgentSkill({
          skill: created.skill,
          version: created.version,
          files,
          targets,
          baseUrl,
        }),
      },
      201,
      "GET, POST, OPTIONS",
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonResponse(getErrorPayload(error), status, "GET, POST, OPTIONS");
  }
}
