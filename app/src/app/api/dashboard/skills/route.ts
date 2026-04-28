import crypto from "node:crypto";
import { NextRequest } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { captureServerEvent } from "@/lib/posthog-server";
import { jsonResponse } from "@/lib/route-helpers";
import { createSkillDraft, listSkillsForOwner } from "@/lib/skills/repository";

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

export async function POST(request: NextRequest) {
  const user = await getDashboardUser(request);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
  }

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

  try {
    const existingSkillCount = (await listSkillsForOwner({ ownerId: user.id })).length;
    const sourceMode = body.source_mode ? String(body.source_mode) : "managed";
    const created = await createSkillDraft({
      ownerId: user.id,
      name: String(body.name ?? ""),
      description: body.description === undefined ? undefined : String(body.description),
      baseUrl: new URL(request.url).origin,
      skillIdGenerator: randomSkillId,
      sourceMode,
      originalRepoFullName: body.original_repo_full_name ? String(body.original_repo_full_name) : undefined,
      originalSkillPath: body.original_skill_path ? String(body.original_skill_path) : undefined,
    });
    await captureServerEvent({
      distinctId: user.id,
      event: "skill_created",
      properties: {
        skill_id: created.skill.skillId,
        skill_name: created.skill.name,
        has_description: Boolean(created.skill.description),
        is_first_skill: existingSkillCount === 0,
        source_mode: sourceMode,
        author_type: "human",
      },
    });
    if (existingSkillCount === 0) {
      await captureServerEvent({
        distinctId: user.id,
        event: "first_skill_created",
        properties: {
          skill_id: created.skill.skillId,
          skill_name: created.skill.name,
          source_mode: sourceMode,
          author_type: "human",
        },
      });
    }

    return jsonResponse(
      {
        skill: created.skill,
        version: created.version,
        file: created.file,
        targets: created.targets,
      },
      201,
      "GET, POST, OPTIONS",
    );
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, "GET, POST, OPTIONS");
  }
}
