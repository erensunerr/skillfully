import { init } from "@instantdb/admin";
import schema from "@/instant.schema";

const instantAppId =
  process.env.NEXT_PUBLIC_INSTANT_APP_ID ||
  "00000000-0000-0000-0000-000000000000";
const instantAdminToken =
  process.env.INSTANT_APP_ADMIN_TOKEN || "local-preview-admin-token";

export const adminDb = init({
  appId: instantAppId,
  adminToken: instantAdminToken,
  schema,
});

export function getAdminDb() {
  return adminDb;
}
