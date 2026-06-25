"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GripVertical,
  Home,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  clampMarqueeRow,
  clampMarqueeRows,
  groupProjectsByMarqueeRow,
} from "@/lib/marquee";
import { buildHomepageDesignReorderItems } from "@/lib/reorder-payload";
import { homepageDesignToProjectShape } from "@/lib/design-module-mappers";
import { homepageSortValue } from "@/lib/design-placement";
import { parseResponseJson } from "@/lib/parse-response";
import type { HomepageDesign, Project } from "@/lib/types/database";

const rowDirections = ["Scrolls left", "Scrolls right", "Scrolls left"] as const;

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

function addDesignHref(row: number) {
  return `/admin/projects/new?type=design&row=${row}`;
}

function AddToRowButton({
  row,
  variant = "header",
}: {
  row: number;
  variant?: "header" | "empty";
}) {
  const href = addDesignHref(row);

  if (variant === "empty") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
      >
        <Plus size={18} />
        Add design to row {row}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors shrink-0"
    >
      <Plus size={14} />
      <span className="hidden sm:inline">Add to row {row}</span>
      <span className="sm:hidden">Add</span>
    </Link>
  );
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
  onRemoveFromHomepage,
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
  onRemoveFromHomepage: () => void;
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
        <div className="min-w-0">
          <p className="text-white text-[10px] font-medium truncate leading-tight">{project.title || "Untitled"}</p>
        </div>

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
            className={`p-1 rounded-md transition-colors ${
              project.published
                ? "text-green-400 bg-green-400/10"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {project.published ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={onRemoveFromHomepage}
              title="Remove from homepage only"
              className="p-1 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
            >
              <Home size={12} />
            </button>
            <Link
              href={`/admin/projects/${project.id}`}
              className="p-1 rounded-md text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
              title="Edit"
            >
              <Pencil size={12} />
            </Link>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
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
  const rowCount = clampMarqueeRows(portfolioRows);
  const [projects, setProjects] = useState(initial);
  const [drag, setDrag] = useState<{ row: number; index: number } | null>(null);
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const layoutSaveQueue = useRef(Promise.resolve());
  const projectsRef = useRef(projects);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    setProjects(initial);
  }, [initial]);

  function setProjectPending(id: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function refetchProjects() {
    const res = await fetch("/api/homepage-designs?admin=true", {
      cache: "no-store",
    });
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

  const rowGroups = useMemo(
    () => groupProjectsByMarqueeRow(projects, rowCount),
    [projects, rowCount]
  );

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
  }

  function queueLayoutSave(task: () => Promise<void>) {
    layoutSaveQueue.current = layoutSaveQueue.current.then(task, task);
    return layoutSaveQueue.current;
  }

  function saveLayoutInBackground(
    updates: { rowProjects: Project[]; row: number }[],
    rollbackSnapshot: Project[]
  ) {
    void queueLayoutSave(async () => {
      try {
        await persistLayout(updates);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
        try {
          await refetchProjects();
        } catch {
          setProjects(rollbackSnapshot);
        }
      }
    });
  }

  async function updateProject(
    id: string,
    patch: { published?: boolean; metadata?: Project["metadata"] }
  ) {
    const res = await fetch(`/api/homepage-designs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = await parseResponseJson<{ error?: string }>(res);
      throw new Error(data.error || "Failed to update design");
    }
    const updated = (await res.json()) as HomepageDesign;
    const shaped = homepageDesignToProjectShape(updated);
    setProjects((prev) => prev.map((p) => (p.id === id ? shaped : p)));
    return shaped;
  }

  async function togglePublished(id: string, published: boolean) {
    const previous = projectsRef.current.find((p) => p.id === id);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, published } : p))
    );
    setProjectPending(id, true);
    try {
      await updateProject(id, { published });
    } catch (err) {
      if (previous) {
        setProjects((prev) => prev.map((p) => (p.id === id ? previous : p)));
      }
      setError(err instanceof Error ? err.message : "Failed to update design");
    } finally {
      setProjectPending(id, false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this design from the homepage showcase only? The /designs gallery will not be affected."
      )
    ) {
      return;
    }

    const previous = projectsRef.current;
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
    } catch (err) {
      setProjects(previous);
      setError(err instanceof Error ? err.message : "Failed to delete design");
    } finally {
      setProjectPending(id, false);
    }
  }

  function applyRowState(updates: Project[]) {
    const idMap = new Map(updates.map((p) => [p.id, p]));
    setProjects((prev) => prev.map((p) => idMap.get(p.id) ?? p));
  }

  function normalizeRowProjects(rowProjects: Project[], rowNum: number) {
    return rowProjects.map((p, index) => ({
      ...p,
      metadata: {
        ...p.metadata,
        marqueeRow: rowNum as 1 | 2 | 3,
        homepageSortOrder: homepageSortValue(rowNum, index),
        showOnHomepage: true,
      },
    }));
  }

  async function handleDrop(targetRow: number, targetIndex: number) {
    if (!drag) return;
    if (drag.row === targetRow && drag.index === targetIndex) {
      setDrag(null);
      return;
    }

    const snapshot = projectsRef.current;
    setError("");

    const sourceRow = drag.row;
    const sourceProjects = [...rowGroups[sourceRow]];
    const [moved] = sourceProjects.splice(drag.index, 1);
    if (!moved) {
      setDrag(null);
      return;
    }

    let layoutUpdates: { rowProjects: Project[]; row: number }[];

    if (sourceRow === targetRow) {
      sourceProjects.splice(targetIndex, 0, moved);
      const normalized = normalizeRowProjects(sourceProjects, sourceRow + 1);
      applyRowState(normalized);
      layoutUpdates = [{ rowProjects: normalized, row: sourceRow + 1 }];
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
      layoutUpdates = [
        { rowProjects: normalizedSource, row: sourceRow + 1 },
        { rowProjects: normalizedTarget, row: targetRowNum },
      ];
    }

    setDrag(null);
    saveLayoutInBackground(layoutUpdates, snapshot);
  }

  function moveToRow(project: Project, targetRow: number) {
    const currentRow = clampMarqueeRow(project.metadata?.marqueeRow ?? 1, rowCount);
    if (currentRow === targetRow) return;

    const snapshot = projectsRef.current;
    setError("");

    const sourceIndex = currentRow - 1;
    const targetIndex = targetRow - 1;
    const sourceProjects = rowGroups[sourceIndex].filter((p) => p.id !== project.id);
    const targetProjects = [...rowGroups[targetIndex], project];

    const normalizedSource = normalizeRowProjects(sourceProjects, currentRow);
    const normalizedTarget = normalizeRowProjects(targetProjects, targetRow);
    applyRowState([...normalizedSource, ...normalizedTarget]);

    saveLayoutInBackground(
      [
        { rowProjects: normalizedSource, row: currentRow },
        { rowProjects: normalizedTarget, row: targetRow },
      ],
      snapshot
    );
  }

  async function removeFromHomepage(project: Project) {
    const previous = projectsRef.current;
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setProjectPending(project.id, true);
    setError("");
    try {
      const res = await fetch(`/api/homepage-designs/${project.id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to remove from homepage");
    } catch (err) {
      setProjects(previous);
      setError(err instanceof Error ? err.message : "Failed to remove from homepage");
    } finally {
      setProjectPending(project.id, false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
        Designs here control only the <strong className="text-zinc-200">homepage marquee</strong>. Reordering
        or moving rows does <strong className="text-zinc-200">not</strong> change the{" "}
        <Link href="/designs" target="_blank" className="text-purple-400 hover:text-purple-300">
          /designs
        </Link>{" "}
        gallery page. Use <strong className="text-zinc-300">Add to row</strong> to add flyers, drag to
        reorder, or move between rows. Remove with the home icon to hide from homepage only.
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
                <h2 className="text-white font-semibold text-sm sm:text-base">Row {rowNum}</h2>
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
              <AddToRowButton row={rowNum} variant="header" />
            </div>

            {rowProjects.length === 0 ? (
              <div
                className="m-3 sm:m-4 p-6 sm:p-10 text-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/40"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(rowIndex, 0)}
              >
                <p className="text-zinc-500 text-sm mb-4">
                  No designs in row {rowNum} yet. Add one or drag a design here from another row.
                </p>
                <AddToRowButton row={rowNum} variant="empty" />
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
                      cardBusy={pendingIds.has(project.id)}
                      onDragStart={() => setDrag({ row: rowIndex, index })}
                      onDrop={() => handleDrop(rowIndex, index)}
                      onMoveRow={(row) => moveToRow(project, row)}
                      onTogglePublished={() => togglePublished(project.id, !project.published)}
                      onRemoveFromHomepage={() => removeFromHomepage(project)}
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
