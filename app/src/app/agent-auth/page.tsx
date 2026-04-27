import AgentAuthClient from "./agent-auth-client";

export default async function AgentAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  return <AgentAuthClient initialCode={params.code ?? ""} />;
}
