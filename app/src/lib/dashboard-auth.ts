import type { NextRequest } from "next/server";

import { adminDb } from "@/lib/adminDb";

export type DashboardUser = {
  id: string;
  email?: string | null;
};

function bearerToken(header: string | null) {
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  return token || null;
}

export async function getDashboardUser(request: NextRequest): Promise<DashboardUser | null> {
  const previewUserId = request.headers.get("x-skillfully-preview-user-id");
  if (!process.env.NEXT_PUBLIC_INSTANT_APP_ID && process.env.NODE_ENV !== "production" && previewUserId) {
    return {
      id: previewUserId,
      email: request.headers.get("x-skillfully-preview-user-email") || "preview@skillfully.local",
    };
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (token) {
    try {
      const user = await adminDb.auth.verifyToken(token);
      return user ? { id: user.id, email: user.email } : null;
    } catch {
      return null;
    }
  }

  try {
    const user = await adminDb.auth.getUserFromRequest(request);
    return user ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

export function requireDashboardUser(user: DashboardUser | null): asserts user is DashboardUser {
  if (!user) {
    throw new Error("unauthorized");
  }
}
