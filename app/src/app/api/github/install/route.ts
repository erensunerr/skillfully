import { NextRequest, NextResponse } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { createGitHubInstallState } from "@/lib/github-install-state";
import { jsonResponse } from "@/lib/route-helpers";

function githubInstallUrl(state: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL;
  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  const url = configuredUrl
    ? new URL(configuredUrl)
    : slug
      ? new URL(`https://github.com/apps/${slug}/installations/new`)
      : null;
  if (!url) {
    throw new Error("GitHub App install URL is not configured");
  }
  url.searchParams.set("state", state);
  return url;
}

async function createInstallUrl(request: NextRequest) {
  const user = await getDashboardUser(request);
  if (!user) {
    return null;
  }

  return githubInstallUrl(createGitHubInstallState({ ownerId: user.id }));
}

export async function GET(request: NextRequest) {
  try {
    const installUrl = await createInstallUrl(request);
    if (!installUrl) {
      return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
    }
    return NextResponse.redirect(installUrl);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, "GET, POST, OPTIONS");
  }
}

export async function POST(request: NextRequest) {
  try {
    const installUrl = await createInstallUrl(request);
    if (!installUrl) {
      return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
    }
    return jsonResponse({ install_url: installUrl.toString() }, 200, "GET, POST, OPTIONS");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown error" }, 400, "GET, POST, OPTIONS");
  }
}

export async function OPTIONS() {
  return jsonResponse({}, 200, "GET, POST, OPTIONS");
}
