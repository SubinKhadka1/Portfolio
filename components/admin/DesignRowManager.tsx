"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  clampMarqueeRow,
  clampMarqueeRows,
  groupProjectsByMarqueeRow,
  marqueeSortOrder,
} from "@/lib/marquee";
import { buildHomepageDesignReorderItems } from "@/lib/reorder-payload";
import { homepageDesignToProjectShape } from "@/lib/design-module-mappers";
import { homepageSortValue } from "@/lib/design-placement";
import {
  createDraftHomepageDesignId,
  isDraftHomepageDesignId,
  projectToHomepageDesignInput,
  uploadHomepageDesignFiles,
} from "@/lib/homepage-design-create";
import { parseResponseJson } from "@/lib/parse-response";
import type { HomepageDesign, HomepageDesignInput, Project } from "@/lib/types/database";

const rowDirections = ["Scrolls left", "Scrolls right", "Scrolls left"] as const;
const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp,.svg";

function projectToHomepageDesign(project: Project): HomepageDesign {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    media_url: project.media_url,
    sort_order: project.metadata?.homepageSortOrder ?? project.sort_order,
    published: project.published,
    metadata: project.metadata,
    source_gallery_design_id: null,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };
}

function draftProjectFromInput(id: string, input: HomepageDesignInput): Project {
  const now = new Date().toISOString();
  const row = clampMarqueeRow(input.metadata?.marqueeRow ?? 1);
  return {
    id,
    type: "design",
    title: input.title || "",
    description: input.description || "",
    media_url: input.media_url,
    thumbnail_url: null,
    category_id: null,
    featured: false,
    published: input.published ?? true,
    sort_order: marqueeSortOrder(row, 0),
    metadata: {
      ...input.metadata,
      marqueeRow: row,
      homepageSortOrder: marqueeSortOrder(row, 0),
      showOnHomepage: true,
    },
    created_at: now,
    updated_at: now,
    categories: null,
  };
}

function DesignRowCard({
  project,
  rowIndex,
  rowCount,
  disabled,
  onDragStart,
  onDrop,
  onMoveRow,
  onTogglePublished,
  onDelete,
}: {
  project: Project;
  rowIndex: number;
  rowCount: number;
  disabled: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onMoveRow: (row: number) => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  const isPortrait = project.metadata?.aspectRatio === "portrait";
  const isDraft = isDraftHomepageDesignId(project.id);

  return (
    <article
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`design-row-card shrink-0 snap-start bg-zinc-950 border rounded-lg overflow-hidden transition-colors flex flex-col ${
        isDraft ? "border-amber-500/50" : "border-zinc-800 hover:border-purple-500/40"
      }`}
    >
      <div className="relative p-1.5 pb-0">
        <div
          className={`mx-auto rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/50 ${
            isPortrait ? "design-row-thumb design-row-thumb--portrait" : "design-row-thumb design-row-thumb--square"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.media_url}
            alt={project.title}
            className={`w-full h-full ${isPortrait ? "object-contain" : "object-cover"}`}
          />
        </div>
        <span className="absolute top-1 right-1 text-zinc-600 cursor-grab active:cursor-grabbing">
          <GripVertical size={12} />
        </span>
        {isDraft && (
          <span className="absolute top-1 left-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            New
          </span>
        )}
      </div>

      <div className="p-1.5 flex flex-col flex-1 gap-1 min-w-0">
        <p className="text-white text-[10px] font-medium truncate leading-tight">{project.title || "Untitled"}</p>

        {rowCount > 1 && (
          <select
            value={clampMarqueeRow(project.metadata?.marqueeRow ?? rowIndex + 1, rowCount)}
            onChange={(e) => onMoveRow(Number(e.target.value))}
            className="admin-input admin-input-compact w-full"
            disabled={disabled}
          >
            {Array.from({ length: rowCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Row {i + 1}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center justify-between mt-auto">
          <button
            type="button"
            onClick={onTogglePublished}
            title="Toggle published"
            disabled={disabled}
            className={`p-1 rounded-md transition-colors ${
              project.published
                ? "text-green-400 bg-green-400/10"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {project.published ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <div className="flex gap-0.5">
            {!isDraft && (
              <Link
                href={`/admin/projects/${project.id}`}
                className="p-1 rounded-md text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
                title="Edit details"
              >
                <Pencil size={12} />
              </Link>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              title="Remove from homepage"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DesignRowManager({
  projects: initial,
  portfolioRows,
}: {
  projects: Project[];
  portfolioRows: number;
}) {
  const router = useRouter();
  const rowCount = clampMarqueeRows(portfolioRows);
  const snapshotRef = useRef(JSON.stringify(initial));
  const fileRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState(initial);
  const [drag, setDrag] = useState<{ row: number; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadRow, setUploadRow] = useState<1 | 2 | 3>(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isDirty = useMemo(
    () => JSON.stringify(projects) !== snapshotRef.current,
    [projects]
  );

  const rowGroups = useMemo(
    () => groupProjectsByMarqueeRow(projects, rowCount),
    [projects, rowCount]
  );

  const flash = useCallback((msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage("");
    } else {
      setMessage(msg);
      setError("");
    }
    window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 3500);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  async function refetchProjects() {
    const res = await fetch("/api/homepage-designs?admin=true", { cache: "no-store" });
    const data = await parseResponseJson<HomepageDesign[] | { error?: string }>(res);
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(
        !Array.isArray(data) && data.error ? data.error : "Failed to refresh designs"
      );
    }
    return data.map(homepageDesignToProjectShape);
  }

  function applyRowState(updates: Project[]) {
    const idMap = new Map(updates.map((p) => [p.id, p]));
    setProjects((prev) => prev.map((p) => idMap.get(p.id) ?? p));
  }

  function normalizeRowProjects(rowProjects: Project[], rowNum: number) {
    return rowProjects.map((p, index) => ({
      ...p,
      sort_order: marqueeSortOrder(rowNum, index),
      metadata: {
        ...p.metadata,
        marqueeRow: rowNum as 1 | 2 | 3,
        homepageSortOrder: homepageSortValue(rowNum, index),
        showOnHomepage: true,
      },
    }));
  }

  function handleDrop(targetRow: number, targetIndex: number) {
    if (!drag || saving || uploading) return;
    if (drag.row === targetRow && drag.index === targetIndex) {
      setDrag(null);
      return;
    }

    const sourceRow = drag.row;
    const sourceProjects = [...rowGroups[sourceRow]];
    const [moved] = sourceProjects.splice(drag.index, 1);
    if (!moved) {
      setDrag(null);
      return;
    }

    if (sourceRow === targetRow) {
      sourceProjects.splice(targetIndex, 0, moved);
      applyRowState(normalizeRowProjects(sourceProjects, sourceRow + 1));
    } else {
      const targetProjects = [...rowGroups[targetRow]];
      const targetRowNum = targetRow + 1;
      const updatedMoved: Project = {
        ...moved,
        metadata: { ...moved.metadata, marqueeRow: targetRowNum as 1 | 2 | 3 },
      };
      targetProjects.splice(targetIndex, 0, updatedMoved);
      applyRowState([
        ...normalizeRowProjects(sourceProjects, sourceRow + 1),
        ...normalizeRowProjects(targetProjects, targetRowNum),
      ]);
    }

    setDrag(null);
  }

  function moveToRow(project: Project, targetRow: number) {
    if (saving || uploading) return;
    const currentRow = clampMarqueeRow(project.metadata?.marqueeRow ?? 1, rowCount);
    if (currentRow === targetRow) return;

    const sourceIndex = currentRow - 1;
    const targetIndex = targetRow - 1;
    const sourceProjects = rowGroups[sourceIndex].filter((p) => p.id !== project.id);
    const targetProjects = [...rowGroups[targetIndex], project];

    applyRowState([
      ...normalizeRowProjects(sourceProjects, currentRow),
      ...normalizeRowProjects(targetProjects, targetRow),
    ]);
  }

  function handleDelete(id: string) {
    if (
      !confirm(
        "Remove this design from the homepage marquee? Click Save Changes to apply. The /designs gallery is not affected."
      )
    ) {
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function togglePublished(id: string, published: boolean) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, published } : p)));
  }

  function cancelChanges() {
    setProjects(JSON.parse(snapshotRef.current) as Project[]);
    setShowUpload(false);
    flash("Changes discarded.");
  }

  async function runUpload(files: File[]) {
    const allowed = files.filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|svg)$/i.test(file.name));
    if (!allowed.length) {
      flash("Please choose PNG, JPG, WebP, or SVG images.", true);
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${allowed.length} file${allowed.length === 1 ? "" : "s"}…`);
    try {
      const { drafts, failed } = await uploadHomepageDesignFiles(allowed, uploadRow, setUploadProgress);
      if (drafts.length) {
        const targetIndex = uploadRow - 1;
        const targetProjects = [...rowGroups[targetIndex]];
        const newProjects = drafts.map((draft) =>
          draftProjectFromInput(createDraftHomepageDesignId(), draft)
        );
        const normalized = normalizeRowProjects([...targetProjects, ...newProjects], uploadRow);
        const normalizedIds = new Set(normalized.map((p) => p.id));
        setProjects((prev) => [
          ...prev.filter((p) => !normalizedIds.has(p.id)),
          ...normalized,
        ]);
        flash(`${drafts.length} design${drafts.length === 1 ? "" : "s"} added. Click Save Changes to publish.`);
        setShowUpload(false);
      }
      if (failed.length) flash(`${failed.length} upload${failed.length === 1 ? "" : "s"} failed.`, true);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed", true);
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveAll() {
    if (!isDirty || saving) return;

    const savedSnapshot = JSON.parse(snapshotRef.current) as Project[];
    const savedById = new Map(savedSnapshot.map((p) => [p.id, p]));
    const currentById = new Map(projects.map((p) => [p.id, p]));

    setSaving(true);
    setError("");

    try {
      const toDelete = savedSnapshot
        .map((p) => p.id)
        .filter((id) => !currentById.has(id) && !isDraftHomepageDesignId(id));

      for (const id of toDelete) {
        const res = await fetch(`/api/homepage-designs/${id}`, {
          method: "DELETE",
          cache: "no-store",
        });
        const data = await parseResponseJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Failed to delete design");
      }

      const draftProjects = projects.filter((p) => isDraftHomepageDesignId(p.id));
      const idRemap = new Map<string, string>();

      if (draftProjects.length) {
        const payloads: HomepageDesignInput[] = draftProjects.map((p) =>
          projectToHomepageDesignInput(p)
        );
        const res = await fetch("/api/homepage-designs/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payloads }),
          cache: "no-store",
        });
        const data = await parseResponseJson<HomepageDesign[] | { error?: string }>(res);
        if (!res.ok || !Array.isArray(data)) {
          throw new Error(!Array.isArray(data) && data.error ? data.error : "Failed to add designs");
        }

        draftProjects.forEach((draft) => {
          const created = data.find(
            (item) =>
              item.media_url === draft.media_url &&
              clampMarqueeRow(item.metadata?.marqueeRow ?? 1) ===
                clampMarqueeRow(draft.metadata?.marqueeRow ?? 1)
          );
          if (created) idRemap.set(draft.id, created.id);
        });
      }

      let workingProjects = projects.map((p) => {
        const remappedId = idRemap.get(p.id);
        if (!remappedId) return p;
        return { ...p, id: remappedId };
      });

      const publishUpdates = workingProjects.filter((p) => {
        const saved = savedById.get(p.id);
        return saved && saved.published !== p.published;
      });

      for (const project of publishUpdates) {
        const res = await fetch(`/api/homepage-designs/${project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: project.published }),
          cache: "no-store",
        });
        const data = await parseResponseJson<HomepageDesign & { error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Failed to update design");
        workingProjects = workingProjects.map((p) =>
          p.id === project.id ? homepageDesignToProjectShape(data) : p
        );
      }

      const items = Array.from({ length: rowCount }, (_, rowIndex) => {
        const rowNum = rowIndex + 1;
        const rowProjects = groupProjectsByMarqueeRow(workingProjects, rowCount)[rowIndex] || [];
        return buildHomepageDesignReorderItems(
          rowProjects.map((p) => projectToHomepageDesign(p)),
          rowNum
        );
      }).flat();

      if (items.length) {
        const res = await fetch("/api/homepage-designs/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
          cache: "no-store",
        });
        const data = await parseResponseJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "Failed to save design order");
      }

      let fresh: Project[];
      try {
        fresh = await refetchProjects();
      } catch {
        fresh = workingProjects;
      }

      setProjects(fresh);
      snapshotRef.current = JSON.stringify(fresh);
      router.refresh();
      flash("Changes saved. Homepage updated.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to save changes", true);
    } finally {
      setSaving(false);
    }
  }

  const interactionDisabled = saving || uploading;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-black/90 backdrop-blur border-b border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm sm:text-base">Homepage marquee editor</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Drag to reorder · move between rows · then{" "}
              <span className="text-zinc-300">Save Changes</span> to go live
              {isDirty ? (
                <span className="text-amber-400"> · unsaved changes</span>
              ) : (
                <span className="text-green-400/90"> · all saved</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              disabled={interactionDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors disabled:opacity-50"
            >
              <Plus size={15} />
              Add designs
            </button>
            <button
              type="button"
              onClick={cancelChanges}
              disabled={!isDirty || interactionDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={!isDirty || interactionDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save changes
            </button>
          </div>
        </div>
      </div>

      {(message || error) && (
        <p
          className={`text-sm rounded-lg px-3 py-2 border ${
            error
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-green-400 bg-green-500/10 border-green-500/20"
          }`}
        >
          {error || message}
        </p>
      )}

      {showUpload && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-white font-medium text-sm">Add designs to homepage</p>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="text-zinc-500 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <label className="block text-zinc-400 text-xs font-medium">
            Row
            <select
              value={uploadRow}
              onChange={(e) => setUploadRow(Number(e.target.value) as 1 | 2 | 3)}
              className="admin-input mt-1.5 w-full sm:w-auto"
              disabled={uploading}
            >
              {Array.from({ length: rowCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Row {i + 1}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) void runUpload(files);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-zinc-700 hover:border-purple-500/50 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={22} className="animate-spin text-purple-400" />
                <span className="text-sm">{uploadProgress || "Uploading…"}</span>
              </>
            ) : (
              <>
                <Upload size={22} className="text-purple-400" />
                <span className="text-sm font-medium">Click to upload or drop images here</span>
                <span className="text-xs text-zinc-500">PNG, JPG, WebP, SVG · multiple files OK</span>
              </>
            )}
          </button>
          <p className="text-zinc-500 text-xs">
            Images upload now, but won&apos;t appear on the live homepage until you click{" "}
            <strong className="text-zinc-300">Save changes</strong>.
          </p>
        </div>
      )}

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
        This controls only the <strong className="text-zinc-200">homepage marquee</strong>, not the{" "}
        <Link href="/designs" target="_blank" className="text-purple-400 hover:text-purple-300">
          /designs
        </Link>{" "}
        gallery. Drag cards to reorder or swap rows, then save. Gallery edits are in{" "}
        <Link href="/admin/categories" className="text-purple-400 hover:text-purple-300">
          Design Gallery
        </Link>
        .
      </div>

      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const rowNum = rowIndex + 1;
        const rowProjects = rowGroups[rowIndex] || [];
        const direction = rowDirections[rowIndex] || rowDirections[0];

        return (
          <section
            key={rowIndex}
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(rowIndex, rowProjects.length)}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold text-sm sm:text-base">Row {rowNum}</h3>
                <p className="text-zinc-500 text-xs mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span>{direction}</span>
                  <span className="text-zinc-700 hidden sm:inline">·</span>
                  <span>
                    {rowProjects.length} design{rowProjects.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-zinc-700 hidden md:inline">·</span>
                  <span className="hidden md:inline-flex items-center gap-1 text-zinc-600">
                    {rowIndex % 2 === 0 ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                    Homepage direction
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadRow(rowNum as 1 | 2 | 3);
                  setShowUpload(true);
                }}
                disabled={interactionDisabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors shrink-0 disabled:opacity-50"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Add to row {rowNum}</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>

            {rowProjects.length === 0 ? (
              <div
                className="m-3 sm:m-4 p-6 sm:p-10 text-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(rowIndex, 0)}
              >
                <p className="text-zinc-500 text-sm mb-4">
                  No designs in row {rowNum} yet. Add images or drag a design here from another row.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadRow(rowNum as 1 | 2 | 3);
                    setShowUpload(true);
                  }}
                  disabled={interactionDisabled}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                >
                  <Plus size={18} />
                  Add design to row {rowNum}
                </button>
              </div>
            ) : (
              <div
                className="design-row-scroll p-2 sm:p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(rowIndex, rowProjects.length)}
              >
                <div className="design-row-track">
                  {rowProjects.map((project, index) => (
                    <DesignRowCard
                      key={project.id}
                      project={project}
                      rowIndex={rowIndex}
                      rowCount={rowCount}
                      disabled={interactionDisabled}
                      onDragStart={() => setDrag({ row: rowIndex, index })}
                      onDrop={() => handleDrop(rowIndex, index)}
                      onMoveRow={(row) => moveToRow(project, row)}
                      onTogglePublished={() => togglePublished(project.id, !project.published)}
                      onDelete={() => handleDelete(project.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
