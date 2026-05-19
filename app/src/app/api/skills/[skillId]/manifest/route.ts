import { NextRequest } from "next/server";

import { jsonResponse } from "@/lib/route-helpers";
import { serveSkillManifest } from "../install-helpers";

type RouteContext = { params: Promise<{ skillId: string }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { skillId } = await params;
  return serveSkillManifest({ request, skillId });
}
