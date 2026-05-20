import { NextRequest } from "next/server";

import { jsonResponse } from "@/lib/route-helpers";
import { serveSkillInstall } from "../install-helpers";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "POST, OPTIONS");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { skillId } = await params;
  return serveSkillInstall({ request, skillId });
}
