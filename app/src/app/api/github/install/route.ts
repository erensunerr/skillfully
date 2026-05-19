import { NextRequest, NextResponse } from "next/server";

import { getDashboardUser } from "@/lib/dashboard-auth";
import { createGitHubImportSession, selectExistingGitHubInstallation } from "@/lib/github-import";
import { createGitHubInstallState } from "@/lib/github-install-state";
import { jsonResponse } from "@/lib/route-helpers";
import { defaultSkillStore } from "@/lib/skills/repository";

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

async function existingInstallationImportSession(ownerId: string) {
  const rows = await defaultSkillStore.query({
    githubInstallations: {
      $: {
        where: {
          ownerId,
        },
      },
    },
  });
  const installation = selectExistingGitHubInstallation(rows.githubInstallations ?? [], ownerId);
  if (!installation) {
    return null;
  }

  // A stored installation means the GitHub App is already connected for this
  // Skillfully user. Start a fresh import session in Skillfully instead of
  // sending the browser back to GitHub's installation management screen.
  return createGitHubImportSession({
    store: defaultSkillStore,
    ownerId,
    installationId: installation.installationId,
    accountLogin: installation.accountLogin,
    accountType: installation.accountType,
  });
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
    const user = await getDashboardUser(request);
    if (!user) {
      return jsonResponse({ error: "unauthorized" }, 401, "GET, POST, OPTIONS");
    }

    const body = await request.json().catch(() => ({})) as { intent?: unknown };
    // Normal import starts should reuse an existing installation. The
    // repository-access flow opts into GitHub explicitly with intent=configure.
    if (body.intent !== "configure" && process.env.NEXT_PUBLIC_INSTANT_APP_ID) {
      const session = await existingInstallationImportSession(user.id);
      if (session) {
        return jsonResponse({
          session_id: session.sessionId,
          installation_id: session.installationId,
          account_login: session.accountLogin,
        }, 200, "GET, POST, OPTIONS");
      }
    }

    const installUrl = githubInstallUrl(createGitHubInstallState({ ownerId: user.id }));
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
