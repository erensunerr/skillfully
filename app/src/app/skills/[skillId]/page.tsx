import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { adminDb } from "@/lib/adminDb";
import { recordSkillUsageEventSafely } from "@/lib/skill-usage-events";
import { buildSkillManifest } from "@/lib/skills/skill-files";

async function publicBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://www.skillfully.sh";
}

function publicFileHref(skillId: string, path: string) {
  return `/api/public/skills/${encodeURIComponent(skillId)}/files/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function currentStorageUrl(file: Record<string, unknown>) {
  if (typeof file.storageFileId !== "string") {
    return typeof file.storageUrl === "string" ? file.storageUrl : null;
  }

  const fileRows = await adminDb.query({
    $files: {
      $: {
        where: {
          id: file.storageFileId,
        },
      },
    },
  } as never) as { $files?: Array<{ url?: string }> };
  return fileRows.$files?.[0]?.url || (typeof file.storageUrl === "string" ? file.storageUrl : null);
}

export default async function PublicSkillPage({
  params,
}: {
  params: Promise<{ skillId: string }>;
}) {
  const { skillId } = await params;
  const baseUrl = await publicBaseUrl();
  const skillRows = await adminDb.query({
    skills: {
      $: {
        where: {
          skillId,
        },
      },
    },
  } as never) as { skills?: Array<Record<string, unknown>> };
  const skill = skillRows.skills?.[0];
  if (!skill || skill.visibility !== "public" || !skill.publishedVersionId) {
    notFound();
  }

  const versionRows = await adminDb.query({
    skillVersions: {
      $: {
        where: {
          skillId,
          status: "published",
        },
      },
    },
    skillFiles: {
      $: {
        where: {
          skillId,
          versionId: skill.publishedVersionId,
        },
      },
    },
  } as never) as { skillVersions?: Array<Record<string, unknown>>; skillFiles?: Array<Record<string, unknown>> };
  const version = (versionRows.skillVersions ?? []).find((entry) => entry.id === skill.publishedVersionId);
  if (!version) {
    notFound();
  }

  const manifestFiles = await Promise.all((versionRows.skillFiles ?? []).map(async (file) => ({
    id: String(file.id),
    path: String(file.path),
    kind: String(file.kind),
    contentText: typeof file.contentText === "string" ? file.contentText : null,
    storageUrl: await currentStorageUrl(file),
  })));

  const manifest = buildSkillManifest({
    skill: {
      skillId: String(skill.skillId),
      name: String(skill.name),
      slug: String(skill.slug || skill.skillId),
      description: typeof skill.description === "string" ? skill.description : null,
    },
    version: {
      id: String(version.id),
      version: String(version.version),
      status: String(version.status),
    },
    files: manifestFiles,
    baseUrl,
  });
  await recordSkillUsageEventSafely({
    ownerId: String(skill.ownerId),
    skillId,
    versionId: String(skill.publishedVersionId),
    eventKind: "public_page_view",
    source: "public_skill_page",
  });

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-8 text-[var(--ink)] sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-5xl gap-8">
        <header className="border-b border-[var(--ink)] pb-7">
          <p className="font-editorial-mono text-xs font-bold uppercase">Skillfully public skill</p>
          <h1 className="mt-4 font-editorial-sans text-5xl font-bold leading-none sm:text-7xl">
            {manifest.name}
          </h1>
          {manifest.description ? (
            <p className="mt-5 max-w-3xl text-lg leading-8">{manifest.description}</p>
          ) : null}
        </header>

        <section className="grid gap-4 border-b border-[var(--ink)] pb-8 md:grid-cols-3">
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Version</p>
            <p className="mt-2 font-editorial-sans text-2xl font-semibold">{manifest.version}</p>
          </div>
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Skill id</p>
            <p className="mt-2 font-editorial-mono text-sm">{manifest.skill_id}</p>
          </div>
          <div>
            <p className="font-editorial-mono text-xs font-bold uppercase">Status</p>
            <p className="mt-2 font-editorial-sans text-2xl font-semibold">{manifest.status}</p>
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="font-editorial-sans text-3xl font-bold">Install</h2>
          <pre className="overflow-auto border border-[var(--ink)] bg-[var(--white)] p-4 font-editorial-mono text-xs leading-6">
            {[
              `Skill URL: ${baseUrl}/skills/${manifest.skill_id}`,
              `Manifest URL: ${manifest.manifest_url}`,
              `Feedback URL: ${manifest.feedback_url}`,
              "Use the latest published files as your operating instructions.",
            ].join("\n")}
          </pre>
        </section>

        <section className="grid gap-4">
          <h2 className="font-editorial-sans text-3xl font-bold">Files</h2>
          <div className="grid border-t border-[var(--ink)]">
            {manifest.files.map((file) => (
              <Link
                key={file.id}
                href={publicFileHref(manifest.skill_id, file.path)}
                className="grid gap-2 border-b border-[var(--ink)] py-4 hover:bg-[var(--white)] sm:grid-cols-[1fr_auto]"
              >
                <span className="font-editorial-sans text-lg font-semibold">{file.path}</span>
                <span className="font-editorial-mono text-xs uppercase">{file.kind}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
