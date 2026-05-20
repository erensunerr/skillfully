import { Resend } from "resend";

export type SkillInviteEmailParams = {
  toEmail: string;
  fromEmail?: string;
  skillName: string;
  permission: "use" | "edit";
  sharedByEmail?: string | null;
  dashboardUrl: string;
};

type ResendEmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

type ResendSendResult = {
  data?: {
    id?: string | null;
  } | null;
  error?: unknown;
};

type ResendDeps = {
  apiKey?: string | null;
  send?: (message: ResendEmailMessage) => Promise<ResendSendResult> | ResendSendResult;
};

export type SkillInviteEmailResult =
  | { status: "sent"; resendEmailId?: string }
  | { status: "failed"; error: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildInviteHtml(params: SkillInviteEmailParams) {
  const skillName = escapeHtml(params.skillName);
  const permission = params.permission === "edit" ? "edit" : "use";
  const dashboardUrl = escapeHtml(params.dashboardUrl);
  const sharedBy = params.sharedByEmail ? escapeHtml(params.sharedByEmail) : "A Skillfully collaborator";
  const accessDescription = permission === "edit"
    ? "You can use the latest private release, edit drafts, manage collaborators, and publish new releases."
    : "You can use the latest private release. Draft editing and collaborator management are not included.";

  return [
    `<p>${sharedBy} shared <strong>${skillName}</strong> with you on Skillfully.</p>`,
    `<p>Permission: <strong>${permission}</strong>.</p>`,
    `<p>${accessDescription}</p>`,
    `<p><a href="${dashboardUrl}">Open Skillfully</a></p>`,
  ].join("");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "email delivery failed";
}

export async function sendSkillInviteEmail(
  params: SkillInviteEmailParams,
  deps: ResendDeps = {},
): Promise<SkillInviteEmailResult> {
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY ?? "";
  if (!apiKey) {
    return { status: "failed", error: "RESEND_API_KEY is not set" };
  }

  const message: ResendEmailMessage = {
    from: params.fromEmail ?? "eren@skillfully.sh",
    to: params.toEmail,
    subject: `${params.skillName} was shared with you on Skillfully`,
    html: buildInviteHtml(params),
  };

  try {
    const send = deps.send ?? ((email: ResendEmailMessage) => new Resend(apiKey).emails.send(email));
    const result = await send(message);
    if (result.error) {
      return { status: "failed", error: errorMessage(result.error) };
    }
    return {
      status: "sent",
      ...(result.data?.id ? { resendEmailId: result.data.id } : {}),
    };
  } catch (error) {
    return { status: "failed", error: errorMessage(error) };
  }
}
