import { NextRequest } from "next/server";

import { jsonResponse } from "@/lib/route-helpers";
import { serveSkillFile } from "../../../../../skills/[skillId]/install-helpers";

type RouteContext = { params: Promise<{ skillId: string; path: string[] }> };

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, OPTIONS");
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { skillId, path } = await params;
  return serveSkillFile({ request, skillId, path, publicOnly: true });
}
