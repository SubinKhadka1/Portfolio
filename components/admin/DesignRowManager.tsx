"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { uploadDesignsToHomepageRow } from "@/lib/homepage-design-create";
import { parseResponseJson } from "@/lib/parse-response";
import type { HomepageDesign, Project } from "@/lib/types/database";

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

function DesignRowCard({
  project,
  rowIndex,
  rowCount,
  cardBusy,
  onDragStart,
  onDrop,
  onMoveRow,
  onTogglePublished,
  onDelete,
}: {
  project: Project;
  rowIndex: number;
  rowCount: number;
  cardBusy: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onMoveRow: (row: number) => void;
  onTogglePublished: () => void;
  onDelete: () => void;
}) {
  const isPortrait = project.metadata?.aspectRatio === "portrait";

  return (
    <article
      draggable={!cardBusy}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="design-row-card shrink-0 snap-start bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden hover:border-purple-500/40 transition-colors flex flex-col"
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
      </div>

      <div className="p-1.5 flex flex-col flex-1 gap-1 min-w-0">
        <p className="text-white text-[10px] font-medium truncate leading-tight">{project.title || "Untitled"}</p>

        {rowCount > 1 && (
          <select
            value={clampMarqueeRow(project.metadata?.marqueeRow ?? rowIndex + 1, rowCount)}
            onChange={(e) => onMoveRow(Number(e.target.value))}
            className="admin-input admin-input-compact w-full"
            disabled={cardBusy}
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
            disabled={cardBusy}
            className={`p-1 rounded-md transition-colors ${
              project.published
                ? "text-green-400 bg-green-400/10"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {project.published ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <div className="flex gap-0.5">
            <Link
              href={`/admin/projects/${project.id}`}
              className="p-1 rounded-md text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
              title="Edit details"
            >
              <Pencil size={12} />
            </Link>
            <button
              type="button"
              onClick={onDelete}
              disabled={cardBusy}
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
  const projectsRef = useRef(initial);
  const fileRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState(initial);
  const [drag, setDrag] = useState<{ row: number; index: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadRow, setUploadRow] = useState<1 | 2 | 3>(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const rowGroups = useMemo(
    () => groupProjectsByMarqueeRow(projects, rowCount),
    [projects, rowCount]
  );

  function flash(msg: string, isError = false) {
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
    }, 4000);
  }

  function setProjectPending(id: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function refetchProjects() {
    const res = await fetch("/api/homepage-designs?admin=true", { cache: "no-store" });
    const data = await parseResponseJson<HomepageDesign[] | { error?: string }>(res);
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(
        !Array.isArray(data) && data.error ? data.error : "Failed to refresh designs"
      );
    }
    const shaped = data.map(homepageDesignToProjectShape);
    setProjects(shaped);
    return shaped;
  }

  async function persistLayout(updates: { rowProjects: Project[]; row: number }[]) {
    const items = updates.flatMap(({ rowProjects, row }) =>
      buildHomepageDesignReorderItems(
        rowProjects.map(projectToHomepageDesign),
        row
      )
    );

    const res = await fetch("/api/homepage-designs/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      cache: "no-store",
    });
    const data = await parseResponseJson<{ error?: string }>(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to save design order");
    }

    router.refresh();
  }

  async function persistRowOrder(row: number, rowProjects: Project[]) {
    await persistLayout([{ rowProjects, row }]);
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

  async function handleDrop(targetRow: number, targetIndex: number) {
    if (!drag || busy || uploading) return;
    if (drag.row === targetRow && drag.index === targetIndex) {
      setDrag(null);
      return;
    }

    const snapshot = projectsRef.current;
    setBusy(true);
    setError("");

    try {
      const sourceRow = drag.row;
      const sourceProjects = [...rowGroups[sourceRow]];
      const [moved] = sourceProjects.splice(drag.index, 1);
      if (!moved) return;

      if (sourceRow === targetRow) {
        sourceProjects.splice(targetIndex, 0, moved);
        const normalized = normalizeRowProjects(sourceProjects, sourceRow + 1);
        applyRowState(normalized);
        await persistRowOrder(sourceRow + 1, normalized);
        flash("Order saved.");
      } else {
        const targetProjects = [...rowGroups[targetRow]];
        const targetRowNum = targetRow + 1;
        const updatedMoved: Project = {
          ...moved,
          metadata: { ...moved.metadata, marqueeRow: targetRowNum as 1 | 2 | 3 },
        };
        targetProjects.splice(targetIndex, 0, updatedMoved);

        const normalizedSource = normalizeRowProjects(sourceProjects, sourceRow + 1);
        const normalizedTarget = normalizeRowProjects(targetProjects, targetRowNum);
        applyRowState([...normalizedSource, ...normalizedTarget]);
        await persistLayout([
          { rowProjects: normalizedSource, row: sourceRow + 1 },
          { rowProjects: normalizedTarget, row: targetRowNum },
        ]);
        flash("Design moved.");
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to save", true);
      try {
        await refetchProjects();
      } catch {
        setProjects(snapshot);
      }
    } finally {
      setBusy(false);
      setDrag(null);
    }
  }

  async function moveToRow(project: Project, targetRow: number) {
    if (busy || uploading) return;
    const currentRow = clampMarqueeRow(project.metadata?.marqueeRow ?? 1, rowCount);
    if (currentRow === targetRow) return;

    const snapshot = projectsRef.current;
    setBusy(true);
    setError("");

    try {
      const sourceIndex = currentRow - 1;
      const targetIndex = targetRow - 1;
      const sourceProjects = rowGroups[sourceIndex].filter((p) => p.id !== project.id);
      const targetProjects = [...rowGroups[targetIndex], project];

      const normalizedSource = normalizeRowProjects(sourceProjects, currentRow);
      const normalizedTarget = normalizeRowProjects(targetProjects, targetRow);
      applyRowState([...normalizedSource, ...normalizedTarget]);

      await persistLayout([
        { rowProjects: normalizedSource, row: currentRow },
        { rowProjects: normalizedTarget, row: targetRow },
      ]);
      flash("Design moved.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to save", true);
      try {
        await refetchProjects();
      } catch {
        setProjects(snapshot);
      }
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(id: string, published: boolean) {
    const previous = projectsRef.current.find((p) => p.id === id);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, published } : p)));
    setProjectPending(id, true);
    try {
      const res = await fetch(`/api/homepage-designs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
        cache: "no-store",
      });
      const data = await parseResponseJson<HomepageDesign & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to update design");
      const shaped = homepageDesignToProjectShape(data);
      setProjects((prev) => prev.map((p) => (p.id === id ? shaped : p)));
      router.refresh();
    } catch (err) {
      if (previous) {
        setProjects((prev) => prev.map((p) => (p.id === id ? previous : p)));
      }
      flash(err instanceof Error ? err.message : "Failed to update design", true);
    } finally {
      setProjectPending(id, false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Remove this design from the homepage marquee? The /designs gallery will not be affected."
      )
    ) {
      return;
    }

    const snapshot = projectsRef.current;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setProjectPending(id, true);
    setError("");

    try {
      const res = await fetch(`/api/homepage-designs/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to delete design");
      try {
        await refetchProjects();
      } catch {
        // Delete succeeded; keep optimistic UI if refresh lags.
      }
      router.refresh();
      flash("Design removed from homepage.");
    } catch (err) {
      setProjects(snapshot);
      flash(err instanceof Error ? err.message : "Failed to delete design", true);
    } finally {
      setProjectPending(id, false);
    }
  }

  async function runUpload(files: File[]) {
    const allowed = files.filter(
      (file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|svg)$/i.test(file.name)
    );
    if (!allowed.length) {
      flash("Please choose PNG, JPG, WebP, or SVG images.", true);
      return;
    }

    const rowIndex = uploadRow - 1;
    const designsInRow = rowGroups[rowIndex]?.length ?? 0;

    setUploading(true);
    setUploadProgress(`Uploading ${allowed.length} file${allowed.length === 1 ? "" : "s"}…`);
    setError("");

    try {
      const result = await uploadDesignsToHomepageRow({
        files: allowed,
        row: uploadRow,
        designsInRow,
        onProgress: setUploadProgress,
      });

      if (result.created.length) {
        const createdProjects = result.created.map(homepageDesignToProjectShape);
        setProjects((prev) => {
          const ids = new Set(createdProjects.map((p) => p.id));
          return [...prev.filter((p) => !ids.has(p.id)), ...createdProjects];
        });
        try {
          await refetchProjects();
        } catch {
          // Records were saved; keep created cards visible.
        }
        router.refresh();
        flash(
          `${result.created.length} design${result.created.length === 1 ? "" : "s"} added to row ${uploadRow}.`
        );
        setShowUpload(false);
      }

      if (result.failed.length) {
        const detail = result.failed[0]?.error;
        flash(
          `${result.failed.length} file${result.failed.length === 1 ? "" : "s"} failed${detail ? `: ${detail}` : ""}`,
          true
        );
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed", true);
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const interactionDisabled = busy || uploading;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-black/90 backdrop-blur border-b border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-sm sm:text-base">Homepage marquee</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Drag to reorder · changes save instantly · same flow as Design Gallery
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            disabled={interactionDisabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 shrink-0"
          >
            <Plus size={15} />
            Add designs
          </button>
        </div>
      </div>

      {(busy || uploading) && (
        <p className="text-zinc-400 text-sm bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin shrink-0" />
          {uploading ? uploadProgress || "Uploading…" : "Saving changes…"}
        </p>
      )}

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
            <p className="text-white font-medium text-sm">Add designs to homepage row</p>
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
                <span className="text-sm font-medium">Click to upload images</span>
                <span className="text-xs text-zinc-500">PNG, JPG, WebP, SVG · saves to live site immediately</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
        Controls the <strong className="text-zinc-200">homepage marquee only</strong> — not the{" "}
        <Link href="/designs" target="_blank" className="text-purple-400 hover:text-purple-300">
          /designs
        </Link>{" "}
        gallery. Drag to reorder, use the row dropdown to move designs, or upload new flyers. Gallery
        edits are in{" "}
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
                Add to row {rowNum}
              </button>
            </div>

            {rowProjects.length === 0 ? (
              <div
                className="m-3 sm:m-4 p-6 sm:p-10 text-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(rowIndex, 0)}
              >
                <p className="text-zinc-500 text-sm mb-4">
                  No designs in row {rowNum}. Upload images or drag a design here.
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
                  Add to row {rowNum}
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
                      cardBusy={pendingIds.has(project.id) || interactionDisabled}
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
