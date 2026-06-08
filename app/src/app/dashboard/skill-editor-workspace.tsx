"use client";

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { isUsingLocalPreviewDb } from "@/lib/db";
import { isPrimarySkillMarkdownPath } from "@/lib/skills/managed-block";
import { buildSkillMarkdown, extractSkillMarkdownBody } from "@/lib/skills/skill-frontmatter";
import { captureClientException } from "@/lib/client-analytics";
import type { AppUser, DashboardTab, MdxMarkdownEditorProps, PublishApiResult, PublishModalStep, Skill, SkillEditorFile, SkillUsageEvent } from "./dashboard-model";
import { DASHBOARD_BUTTON_LIGHT, DASHBOARD_CARD, DASHBOARD_INPUT, activationChecklistItems, buildPublicInstallPrompt, canEditSkill, dashboardFormData, dashboardJson, extractErrorMessage, fallbackEditorFiles, frontmatterStateFromFiles, hasInstallationConfirmation, isEditableSkillFile, markdownFilePathFromInput, skillPackageFrontmatterName, skillRoute, skillVisibility, sortSkillFiles } from "./dashboard-model";
import { isAnalyticsLocked } from "./view-state";
import { CheckCircleIcon, FileGlyph } from "./dashboard-icons";
import { PublishSkillModal } from "./publish-skill-modal";
import { SkillShareDialog } from "./skill-share-dialog";

let cachedMdxMarkdownEditor: ComponentType<MdxMarkdownEditorProps> | null = null;
let mdxMarkdownEditorLoad: Promise<ComponentType<MdxMarkdownEditorProps>> | null = null;

function loadMdxMarkdownEditor() {
  if (cachedMdxMarkdownEditor) {
    return Promise.resolve(cachedMdxMarkdownEditor);
  }

  mdxMarkdownEditorLoad ??= import("./mdx-editor-client").then((mod) => {
    cachedMdxMarkdownEditor = mod.MdxMarkdownEditor;
    return mod.MdxMarkdownEditor;
  });

  return mdxMarkdownEditorLoad;
}

function MdxMarkdownEditor(props: MdxMarkdownEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<MdxMarkdownEditorProps> | null>(() => cachedMdxMarkdownEditor);

  useEffect(() => {
    if (Editor) {
      return;
    }

    let isMounted = true;

    loadMdxMarkdownEditor().then((LoadedEditor) => {
      if (isMounted) {
        setEditor(() => LoadedEditor);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [Editor]);

  if (!Editor) {
    return (
      <div className="h-full min-h-72 border border-[var(--ink)] bg-[var(--paper)] p-5 font-editorial-mono text-xs uppercase">
        MDXEditor loading...
      </div>
    );
  }

  return <Editor {...props} />;
}

function EditorPanelToggle({
  label,
  isOpen,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-editorial-mono text-xs font-bold uppercase">{label}</p>
      <button
        type="button"
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${label.toLowerCase()}`}
        className="text-2xl leading-none"
        onClick={onToggle}
      >
        {isOpen ? "‹" : "›"}
      </button>
    </div>
  );
}

function CollapsedEditorRail({
  label,
  onToggle,
}: {
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-full min-h-16 w-full items-center justify-center border-[var(--ink)] font-editorial-mono text-xs font-bold uppercase"
      aria-label={`Expand ${label.toLowerCase()}`}
      onClick={onToggle}
    >
      <span className="xl:[writing-mode:vertical-rl]">{label}</span>
      <span aria-hidden className="ml-2 xl:ml-0 xl:mt-3">›</span>
    </button>
  );
}

function editorGridClass(isFilesOpen: boolean, isFrontmatterOpen: boolean) {
  if (isFilesOpen && isFrontmatterOpen) {
    return "xl:grid-cols-[17.5rem_minmax(0,1fr)_21.5rem]";
  }

  if (!isFilesOpen && isFrontmatterOpen) {
    return "xl:grid-cols-[3.5rem_minmax(0,1fr)_21.5rem]";
  }

  if (isFilesOpen && !isFrontmatterOpen) {
    return "xl:grid-cols-[17.5rem_minmax(0,1fr)_3.5rem]";
  }

  return "xl:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]";
}

function ActivationChecklistCard({
  items,
}: {
  items: Array<{ label: string; done: boolean }>;
}) {
  return (
    <section className={`${DASHBOARD_CARD} p-5`}>
      <p className="font-editorial-mono text-xs font-bold uppercase">First publish checklist</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 text-sm leading-6">
            <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center border ${item.done ? "border-emerald-700 bg-emerald-50 text-emerald-700" : "border-[var(--ink)]/35 bg-[var(--white)] text-[var(--ink)]/55"}`}>
              {item.done ? "✓" : "·"}
            </span>
            <span className={item.done ? "text-[var(--ink)]" : "text-[var(--ink)]/72"}>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkillEditorWorkspace({
  skill,
  user,
  usageEvents = [],
  onTabChange,
  onSkillUpdated,
}: {
  skill: Skill;
  user?: AppUser | null;
  usageEvents?: SkillUsageEvent[];
  onTabChange?: (tab: DashboardTab) => void;
  onSkillUpdated?: (skill: Skill) => void;
}) {
  const [files, setFiles] = useState<SkillEditorFile[]>(() => fallbackEditorFiles(skill));
  const [selectedFileId, setSelectedFileId] = useState(() => fallbackEditorFiles(skill)[0]?.id ?? "");
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(() => new Set());
  const [frontmatter, setFrontmatter] = useState({
    ...frontmatterStateFromFiles(skill, fallbackEditorFiles(skill)),
    status: "Draft",
  });
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isFrontmatterOpen, setIsFrontmatterOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<PublishModalStep | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [installPromptCopied, setInstallPromptCopied] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishPullRequestUrl, setPublishPullRequestUrl] = useState<string | null>(null);
  const [installPromptShownAt, setInstallPromptShownAt] = useState<number | null>(null);
  const [, setFileStatus] = useState("Autosaves to Skillfully.");
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isFileSaving, setIsFileSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isCreatingMarkdownFile, setIsCreatingMarkdownFile] = useState(false);
  const [newMarkdownPath, setNewMarkdownPath] = useState("");
  const [deletingFileIds, setDeletingFileIds] = useState<Set<string>>(() => new Set());
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const publicInstallPrompt = useMemo(
    () => buildPublicInstallPrompt(skill),
    [
      skill.name,
      skill.originalRepoFullName,
      skill.originalSkillPath,
      skill.anyoneWithLinkCanUse,
      skill.linkUseToken,
      skill.skillId,
      skill.slug,
      skill.visibility,
    ],
  );
  const markdownFiles = files.filter(isEditableSkillFile);
  const assetFiles = files.filter((file) => !isEditableSkillFile(file));
  const selectedFile =
    files.find((file) => file.id === selectedFileId) ?? markdownFiles[0] ?? files[0] ?? null;
  const selectedFileIsEditable = selectedFile ? isEditableSkillFile(selectedFile) : false;
  const selectedMarkdown = selectedFileIsEditable
    ? isPrimarySkillMarkdownPath(selectedFile?.path ?? "")
      ? extractSkillMarkdownBody(selectedFile?.contentText ?? "")
      : selectedFile?.contentText ?? ""
    : "";
  const checklistItems = activationChecklistItems({
    skill,
    summary: frontmatter.summary,
    body: selectedMarkdown,
  });
  const canPersistFiles = Boolean(user && !isUsingLocalPreviewDb);
  const editorStatusLabel = skill.status === "published" || skill.publishedVersionId ? "Published" : "Draft";
  const editorValidationRows = [
    ["SKILL.md present", files.some((file) => file.path.toLowerCase() === "skill.md") ? "Yes" : "Missing"],
    ["Editable files", String(markdownFiles.length)],
    ["Uploaded assets", String(assetFiles.length)],
  ] satisfies Array<[string, string]>;

  useEffect(() => {
    if (publishStep === "waiting" && hasInstallationConfirmation(usageEvents, installPromptShownAt)) {
      setPublishStep("confirmed");
    }
  }, [installPromptShownAt, publishStep, usageEvents]);

  useEffect(() => {
    const fallbackFiles = fallbackEditorFiles(skill);
    setFrontmatter((state) => ({
      ...state,
      ...frontmatterStateFromFiles(skill, fallbackFiles),
    }));
    setDirtyFileIds(new Set());
    setDeletingFileIds(new Set());
    setIsFilesOpen(!isAnalyticsLocked(skill));

    if (!user || isUsingLocalPreviewDb) {
      setFiles(fallbackFiles);
      setSelectedFileId(fallbackFiles[0]?.id ?? "");
      setFileStatus("Local preview changes are kept in memory.");
      return;
    }

    let active = true;
    setIsFileLoading(true);
    setFileStatus("Loading skill files...");
    dashboardJson<{ files: SkillEditorFile[] }>(user, `/api/dashboard/skills/${skill.skillId}/files`)
      .then((payload) => {
        if (!active) return;
        const loadedFiles = sortSkillFiles(payload.files.length > 0 ? payload.files : fallbackFiles);
        setFiles(loadedFiles);
        setFrontmatter((state) => ({
          ...state,
          ...frontmatterStateFromFiles(skill, loadedFiles),
        }));
        setSelectedFileId((current) => {
          if (loadedFiles.some((file) => file.id === current)) {
            return current;
          }
          return loadedFiles.find(isEditableSkillFile)?.id ?? loadedFiles[0]?.id ?? "";
        });
        setFileStatus("All changes saved.");
      })
      .catch((error) => {
        if (!active) return;
        captureClientException(error);
        setFiles(fallbackFiles);
        setFrontmatter((state) => ({
          ...state,
          ...frontmatterStateFromFiles(skill, fallbackFiles),
        }));
        setSelectedFileId(fallbackFiles[0]?.id ?? "");
        setFileStatus(`Could not load saved files: ${extractErrorMessage(error)}`);
      })
      .finally(() => {
        if (active) {
          setIsFileLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    skill.id,
    skill.skillId,
    skill.name,
    skill.description,
    skill.originalSkillPath,
    skill.slug,
    skill.sourceMode,
    user?.id,
    user?.refresh_token,
  ]);

  function updateFrontmatterFields(updates: Partial<Pick<typeof frontmatter, "name" | "summary">>) {
    const nextFrontmatter = {
      ...frontmatter,
      ...updates,
      name: skillPackageFrontmatterName(skill),
    };
    const primarySkillFile = files.find((file) => isPrimarySkillMarkdownPath(file.path) && isEditableSkillFile(file));

    setFrontmatter(nextFrontmatter);

    if (!primarySkillFile) {
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) => {
        if (!isPrimarySkillMarkdownPath(file.path) || !isEditableSkillFile(file)) {
          return file;
        }

        const nextContent = buildSkillMarkdown({
          name: nextFrontmatter.name,
          description: nextFrontmatter.summary,
          body: extractSkillMarkdownBody(file.contentText ?? ""),
        });

        return nextContent === file.contentText ? file : { ...file, contentText: nextContent };
      }),
    );
    setDirtyFileIds((current) => {
      const next = new Set(current);
      next.add(primarySkillFile.id);
      return next;
    });
    setFileStatus("Unsaved changes.");
  }

  function updateSelectedMarkdown(markdown: string) {
    if (!selectedFile || !selectedFileIsEditable) {
      return;
    }

    const nextContent = isPrimarySkillMarkdownPath(selectedFile.path)
      ? buildSkillMarkdown({
        name: frontmatter.name,
        description: frontmatter.summary,
        body: markdown,
      })
      : markdown;

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === selectedFile.id ? { ...file, contentText: nextContent } : file,
      ),
    );
    setDirtyFileIds((current) => {
      const next = new Set(current);
      next.add(selectedFile.id);
      return next;
    });
    setFileStatus("Unsaved changes.");
  }

  async function saveDirtyFiles(fileIds = dirtyFileIds) {
    const dirtyFiles = files.filter((file) => fileIds.has(file.id) && isEditableSkillFile(file));
    if (dirtyFiles.length === 0) {
      return true;
    }
    if (!user || isUsingLocalPreviewDb) {
      setFileStatus("Local preview changes are kept in memory.");
      setDirtyFileIds(new Set());
      return true;
    }

    setIsFileSaving(true);
    setFileStatus("Saving changes...");
    try {
      const savedFiles = await Promise.all(dirtyFiles.map((file) =>
        dashboardJson<{ file: SkillEditorFile }>(
          user,
          `/api/dashboard/skills/${skill.skillId}/files/${file.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              path: file.path,
              content_text: file.contentText ?? "",
            }),
          },
        ),
      ));
      setFiles((currentFiles) => sortSkillFiles(
        currentFiles.map((file) => savedFiles.find((payload) => payload.file.id === file.id)?.file ?? file),
      ));
      setDirtyFileIds((current) => {
        const next = new Set(current);
        dirtyFiles.forEach((file) => next.delete(file.id));
        return next;
      });
      setFileStatus("All changes saved.");
      return true;
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Save failed: ${extractErrorMessage(error)}`);
      return false;
    } finally {
      setIsFileSaving(false);
    }
  }

  useEffect(() => {
    if (dirtyFileIds.size === 0 || isFileLoading || isFileSaving) {
      return;
    }

    const fileIdsToSave = new Set(dirtyFileIds);
    const timer = window.setTimeout(() => {
      void saveDirtyFiles(fileIdsToSave);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [dirtyFileIds, files, isFileLoading, isFileSaving, user?.id, user?.refresh_token]);

  async function uploadSkillFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    if (!user || isUsingLocalPreviewDb) {
      setFileStatus("Uploads require connected Skillfully storage.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("path", file.name);
    setIsUploadingFile(true);
    setFileStatus(`Uploading ${file.name}...`);
    try {
      const payload = await dashboardFormData<{ file: SkillEditorFile }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/files`,
        body,
      );
      setFiles((currentFiles) => sortSkillFiles([
        ...currentFiles.filter((currentFile) => currentFile.id !== payload.file.id),
        payload.file,
      ]));
      if (isEditableSkillFile(payload.file)) {
        setSelectedFileId(payload.file.id);
      }
      setFileStatus(`Uploaded ${payload.file.path}.`);
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Upload failed: ${extractErrorMessage(error)}`);
    } finally {
      setIsUploadingFile(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  async function createMarkdownFile() {
    const path = markdownFilePathFromInput(newMarkdownPath);
    if (!path) {
      setFileStatus("Enter a markdown file path.");
      return;
    }
    if (files.some((file) => file.path.toLowerCase() === path.toLowerCase())) {
      setFileStatus(`${path} already exists.`);
      return;
    }

    if (!user || isUsingLocalPreviewDb) {
      const localFile: SkillEditorFile = {
        id: `local-${skill.id || skill.skillId}-${path}-${Date.now()}`,
        path,
        kind: "markdown",
        mimeType: "text/markdown",
        contentText: "",
      };
      setFiles((currentFiles) => sortSkillFiles([...currentFiles, localFile]));
      setSelectedFileId(localFile.id);
      setNewMarkdownPath("");
      setFileStatus("Local preview changes are kept in memory.");
      return;
    }

    setIsCreatingMarkdownFile(true);
    setFileStatus(`Creating ${path}...`);
    try {
      const payload = await dashboardJson<{ file: SkillEditorFile }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/files`,
        {
          method: "POST",
          body: JSON.stringify({
            path,
            kind: "markdown",
            mime_type: "text/markdown",
            content_text: "",
          }),
        },
      );
      setFiles((currentFiles) => sortSkillFiles([
        ...currentFiles.filter((currentFile) => currentFile.id !== payload.file.id),
        payload.file,
      ]));
      setSelectedFileId(payload.file.id);
      setNewMarkdownPath("");
      setFileStatus(`Created ${payload.file.path}.`);
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Create failed: ${extractErrorMessage(error)}`);
    } finally {
      setIsCreatingMarkdownFile(false);
    }
  }

  function removeFileFromEditor(file: SkillEditorFile) {
    setFiles((currentFiles) => {
      const nextFiles = currentFiles.filter((currentFile) => currentFile.id !== file.id);
      if (selectedFileId === file.id) {
        setSelectedFileId(nextFiles.find(isEditableSkillFile)?.id ?? nextFiles[0]?.id ?? "");
      }
      return sortSkillFiles(nextFiles);
    });
    setDirtyFileIds((current) => {
      const next = new Set(current);
      next.delete(file.id);
      return next;
    });
  }

  async function deleteSkillFileEntry(file: SkillEditorFile) {
    if (isPrimarySkillMarkdownPath(file.path)) {
      setFileStatus("Root SKILL.md cannot be deleted.");
      return;
    }

    if (!user || isUsingLocalPreviewDb) {
      removeFileFromEditor(file);
      setFileStatus(`Deleted ${file.path}.`);
      return;
    }

    setDeletingFileIds((current) => new Set(current).add(file.id));
    setFileStatus(`Deleting ${file.path}...`);
    try {
      await dashboardJson<{ file: SkillEditorFile }>(
        user,
        `/api/dashboard/skills/${skill.skillId}/files/${file.id}`,
        { method: "DELETE" },
      );
      removeFileFromEditor(file);
      setFileStatus(`Deleted ${file.path}.`);
    } catch (error) {
      captureClientException(error);
      setFileStatus(`Delete failed: ${extractErrorMessage(error)}`);
    } finally {
      setDeletingFileIds((current) => {
        const next = new Set(current);
        next.delete(file.id);
        return next;
      });
    }
  }

  async function copyPublicInstallPrompt() {
    await navigator.clipboard.writeText(publicInstallPrompt);
    setInstallPromptCopied(true);
    window.setTimeout(() => setInstallPromptCopied(false), 1200);
  }

  function showInstallPrompt() {
    setInstallPromptShownAt(Date.now());
    setPublishStep("published");
  }

  async function publishVersion() {
    if (isPublishing) {
      return;
    }

    setPublishError("");
    setIsPublishing(true);
    setPublishPullRequestUrl(null);
    if (!user || isUsingLocalPreviewDb) {
      showInstallPrompt();
      setIsPublishing(false);
      return;
    }

    try {
      const result = await dashboardJson<PublishApiResult>(user, `/api/dashboard/skills/${skill.skillId}/publish`, {
        method: "POST",
      });
      const failures = result.results.filter((entry) => entry.status === "failed");
      if (failures.length > 0) {
        setPublishError(
          failures.map((entry) => `${entry.targetKind}: ${entry.error || "failed"}`).join(" | "),
        );
      }
      const pullRequestUrl =
        result.next_action?.type === "merge_github_pull_request"
          ? result.next_action.pull_request_url
          : result.results.find((entry) => entry.targetKind === "github" && entry.status === "submitted")?.url;
      if (pullRequestUrl) {
        setPublishPullRequestUrl(pullRequestUrl);
        setPublishStep("merge");
      } else if (result.results.some((entry) => entry.status === "published" || entry.status === "submitted")) {
        showInstallPrompt();
      } else if (failures.length === 0) {
        setPublishError("No publish target completed. Connect GitHub before publishing.");
      }
    } catch (error) {
      captureClientException(error);
      setPublishError(extractErrorMessage(error));
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper)] text-[var(--ink)]">
      {isAnalyticsLocked(skill) ? (
        <section className="border-b border-[var(--ink)] bg-[var(--white)] px-5 py-4 text-sm leading-6 sm:px-6">
          <p className="font-editorial-mono text-xs font-bold uppercase">Focus mode</p>
          <p className="mt-2 max-w-3xl text-[var(--ink)]/75">
            Start with SKILL.md, add one concrete example, then publish your first version to unlock analytics.
          </p>
        </section>
      ) : null}
      <section className={`grid min-h-0 flex-1 overflow-hidden border-b border-[var(--ink)] ${editorGridClass(isFilesOpen, isFrontmatterOpen)}`}>
        <aside className={`min-h-0 overflow-hidden border-b border-[var(--ink)] xl:border-b-0 xl:border-r ${isFilesOpen ? "p-5" : "p-0"}`}>
          {isFilesOpen ? (
            <div className="flex h-full min-h-0 flex-col">
              <EditorPanelToggle
                label="Files"
                isOpen={isFilesOpen}
                onToggle={() => setIsFilesOpen((current) => !current)}
              />
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 border border-[var(--ink)] px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canPersistFiles || isUploadingFile}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <span className="text-2xl leading-none">+</span>
                  {isUploadingFile ? "Uploading..." : "Upload file"}
                </button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="sr-only"
                  onChange={(event) => void uploadSkillFile(event.currentTarget.files?.[0])}
                />

                <div className="mt-6">
                  <p className="font-editorial-mono text-xs font-bold uppercase">Markdown files (editable)</p>
                  <div className="mt-4 border border-[var(--ink)] bg-[var(--paper)] p-3">
                    <label className="block text-xs font-editorial-mono font-bold uppercase">
                      New markdown file
                      <input
                        className={`${DASHBOARD_INPUT} bg-[var(--white)]`}
                        placeholder="notes.md"
                        value={newMarkdownPath}
                        onChange={(event) => setNewMarkdownPath(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void createMarkdownFile();
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="mt-3 flex w-full items-center justify-center border border-[var(--ink)] bg-[var(--white)] px-3 py-2 font-editorial-mono text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isCreatingMarkdownFile}
                      onClick={() => void createMarkdownFile()}
                    >
                      {isCreatingMarkdownFile ? "Creating..." : "Create markdown file"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {markdownFiles.map((file) => {
                      const isActive = selectedFile?.id === file.id;
                      const isPrimaryFile = isPrimarySkillMarkdownPath(file.path);
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            isActive ? "bg-[var(--white)] font-semibold" : "hover:bg-[var(--white)]"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
                            onClick={() => setSelectedFileId(file.id)}
                          >
                            <FileGlyph />
                            <span className="min-w-0 truncate">{file.path}</span>
                          </button>
                          {isPrimaryFile ? (
                            <span className="border border-[var(--ink)]/45 px-2 py-1 font-editorial-mono text-[0.62rem] uppercase">
                              Root
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="border border-[var(--ink)] px-2 py-1 font-editorial-mono text-[0.62rem] uppercase disabled:opacity-50"
                              disabled={deletingFileIds.has(file.id)}
                              onClick={() => void deleteSkillFileEntry(file)}
                            >
                              {deletingFileIds.has(file.id) ? "Deleting" : "Delete"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {markdownFiles.length === 0 ? (
                      <p className="px-3 py-3 font-editorial-mono text-xs uppercase">No editable files yet.</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 border-t border-[var(--ink)] pt-6">
                  <p className="font-editorial-mono text-xs font-bold uppercase">Assets</p>
                  <div className="mt-4 space-y-2">
                    {assetFiles.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between px-3 py-3 text-sm">
                        <span className="min-w-0 truncate">{asset.path}</span>
                        <button
                          type="button"
                          className="border border-[var(--ink)] px-2 py-1 font-editorial-mono text-[0.62rem] uppercase disabled:opacity-50"
                          disabled={deletingFileIds.has(asset.id)}
                          onClick={() => void deleteSkillFileEntry(asset)}
                        >
                          {deletingFileIds.has(asset.id) ? "Deleting" : "Delete"}
                        </button>
                      </div>
                    ))}
                    {assetFiles.length === 0 ? (
                      <p className="px-3 py-3 font-editorial-mono text-xs uppercase">No assets uploaded.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <CollapsedEditorRail label="Files" onToggle={() => setIsFilesOpen(true)} />
          )}
        </aside>

        <section className="min-h-0 min-w-0 border-b border-[var(--ink)] bg-[var(--white)] xl:border-b-0 xl:border-r">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-12 items-center justify-between border-b border-[var(--ink)] px-5">
              <p className="font-editorial-mono text-xs font-bold uppercase">Markdown editor</p>
              <span className="font-editorial-mono text-xs">
                {isFileLoading ? "Loading files..." : selectedFile?.path || "No file selected"}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {selectedFileIsEditable ? (
                <MdxMarkdownEditor
                  key={selectedFile.id}
                  markdown={selectedMarkdown}
                  onChange={updateSelectedMarkdown}
                />
              ) : (
                <div className="h-full min-h-72 border border-[var(--ink)] bg-[var(--paper)] p-5 font-editorial-mono text-xs uppercase">
                  Select an editable markdown file.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className={`min-h-0 overflow-hidden ${isFrontmatterOpen ? "p-5" : "p-0"}`}>
          {isFrontmatterOpen ? (
            <div className="flex h-full min-h-0 flex-col">
              <EditorPanelToggle
                label="Frontmatter"
                isOpen={isFrontmatterOpen}
                onToggle={() => setIsFrontmatterOpen((current) => !current)}
              />
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                {isAnalyticsLocked(skill) ? <ActivationChecklistCard items={checklistItems} /> : null}
                <div className="mt-6 space-y-5">
                  <label className="block text-sm">
                    <span className="block font-editorial-sans">Name</span>
                    <input
                      className={DASHBOARD_INPUT}
                      value={frontmatter.name}
                      readOnly
                      aria-readonly="true"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-editorial-sans">Summary</span>
                    <textarea
                      className={`${DASHBOARD_INPUT} min-h-24`}
                      value={frontmatter.summary}
                      onChange={(event) => {
                        const nextSummary = event.currentTarget.value;
                        updateFrontmatterFields({ summary: nextSummary });
                      }}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-editorial-sans">Status</span>
                    <div className="mt-2 border border-[var(--ink)] bg-[var(--paper)] px-3 py-3 font-editorial-mono text-sm">
                      {editorStatusLabel}
                    </div>
                  </label>
                </div>

                <div className="mt-7 border-t border-[var(--ink)] pt-6">
                  <p className="font-editorial-mono text-xs font-bold uppercase">Validation</p>
                  <div className="mt-4 space-y-4">
                    {editorValidationRows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-4 text-sm">
                        <span className="flex items-center gap-3">
                          <span className="text-emerald-700"><CheckCircleIcon /></span>
                          {label}
                        </span>
                        {value ? <span>{value}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-7 border-t border-[var(--ink)] pt-6">
                  <p className="font-editorial-mono text-xs font-bold uppercase">Version history</p>
                  <p className="mt-4 text-sm leading-6 text-[var(--ink)]/70">
                    Version history appears after the first publish.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <CollapsedEditorRail label="Frontmatter" onToggle={() => setIsFrontmatterOpen(true)} />
          )}
        </aside>
      </section>

      <section className="flex min-h-24 flex-col gap-3 border-b border-[var(--ink)] p-4 sm:flex-row sm:items-center sm:justify-end">
        {publishError ? (
          <p className="border border-red-600 bg-red-50 p-3 font-editorial-mono text-xs font-bold uppercase text-red-700">
            {publishError}
          </p>
        ) : null}
        {canEditSkill(skill) ? (
          <button
            type="button"
            className={DASHBOARD_BUTTON_LIGHT}
            onClick={() => setIsShareDialogOpen(true)}
          >
            Share
          </button>
        ) : null}
        <Link
          href={skillRoute(skill, "settings")}
          className={`${DASHBOARD_BUTTON_LIGHT} text-center`}
          onClick={(event) => {
            if (!onTabChange) {
              return;
            }

            event.preventDefault();
            onTabChange("settings");
          }}
        >
          Change publishing options
        </Link>
        <button
          type="button"
          className="border border-[var(--ink)] bg-[var(--ink)] px-6 py-4 font-editorial-sans text-lg font-semibold text-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isFileLoading || isFileSaving || isUploadingFile || isPublishing}
          onClick={async () => {
            if (!(await saveDirtyFiles())) {
              setPublishError("Save failed. Try again before publishing.");
              return;
            }
            setInstallPromptCopied(false);
            setPublishStep("confirm");
          }}
        >
          {isFileSaving ? "Saving..." : "Publish version"}
        </button>
      </section>

      {publishStep ? (
        <PublishSkillModal
          step={publishStep}
          skillName={skill.name}
          visibility={skillVisibility(skill)}
          installPrompt={publicInstallPrompt}
          installPromptCopied={installPromptCopied}
          isPublishing={isPublishing}
          publishError={publishError}
          pullRequestUrl={publishPullRequestUrl}
          onCancel={() => setPublishStep(null)}
          onConfirm={() => void publishVersion()}
          onCopyInstallPrompt={() => void copyPublicInstallPrompt()}
          onContinueAfterMerge={showInstallPrompt}
          onContinueToInstallCheck={() => setPublishStep("waiting")}
          onFinish={() => setPublishStep(null)}
        />
      ) : null}
      {isShareDialogOpen ? (
        <SkillShareDialog
          skill={skill}
          user={user}
          onSkillUpdated={onSkillUpdated}
          onClose={() => setIsShareDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
