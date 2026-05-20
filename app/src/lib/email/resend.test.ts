import assert from "node:assert/strict";
import test from "node:test";

import { sendSkillInviteEmail } from "./resend";

test("sendSkillInviteEmail returns sent status with resend id", async () => {
  const sent = await sendSkillInviteEmail(
    {
      toEmail: "new@example.com",
      skillName: "Demo Skill",
      permission: "edit",
      sharedByEmail: "owner@example.com",
      dashboardUrl: "https://www.skillfully.sh/dashboard",
    },
    {
      apiKey: "re_test",
      send: async (message) => {
        assert.equal(message.from, "eren@skillfully.sh");
        assert.equal(message.to, "new@example.com");
        assert.match(String(message.subject), /Demo Skill/);
        assert.match(String(message.html), /edit/);
        return { data: { id: "email_123" }, error: null };
      },
    },
  );

  assert.deepEqual(sent, { status: "sent", resendEmailId: "email_123" });
});

test("sendSkillInviteEmail returns failed status when API key is missing", async () => {
  const sent = await sendSkillInviteEmail(
    {
      toEmail: "new@example.com",
      skillName: "Demo Skill",
      permission: "use",
      dashboardUrl: "https://www.skillfully.sh/dashboard",
    },
    {
      apiKey: "",
      send: async () => {
        throw new Error("should not send");
      },
    },
  );

  assert.equal(sent.status, "failed");
  assert.match(sent.error ?? "", /RESEND_API_KEY/);
});

test("sendSkillInviteEmail returns failed status when Resend throws", async () => {
  const sent = await sendSkillInviteEmail(
    {
      toEmail: "new@example.com",
      skillName: "Demo Skill",
      permission: "use",
      dashboardUrl: "https://www.skillfully.sh/dashboard",
    },
    {
      apiKey: "re_test",
      send: async () => {
        throw new Error("resend unavailable");
      },
    },
  );

  assert.equal(sent.status, "failed");
  assert.match(sent.error ?? "", /resend unavailable/);
});
