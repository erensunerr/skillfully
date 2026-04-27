import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/adminDb";
import { getDashboardUser } from "@/lib/dashboard-auth";

export async function GET(request: NextRequest) {
  const installationId = request.nextUrl.searchParams.get("installation_id");
  const setupAction = request.nextUrl.searchParams.get("setup_action");
  const user = await getDashboardUser(request);

  if (installationId) {
    const now = Date.now();
    const tx = adminDb.tx as unknown as Record<string, Record<string, {
      create: (values: Record<string, unknown>) => unknown;
    }>>;
    await adminDb.transact([
      tx.githubInstallations[crypto.randomUUID()].create({
        ownerId: user?.id,
        installationId,
        accountLogin: "unknown",
        accountType: "User",
        repositorySelection: setupAction || "selected",
        createdAt: now,
        updatedAt: now,
      }),
    ] as never);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
