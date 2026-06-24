"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  EyeOff,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import DesignGalleryJustifiedGrid from "@/components/DesignGalleryJustifiedGrid";
import { buildGalleryReorderItems } from "@/lib/reorder-payload";
import { groupProjectsForGalleryAdmin } from "@/lib/gallery-admin";
import { galleryWidthOverHeight } from "@/lib/design-gallery-layout";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category, Project } from "@/lib/types/database";
import type { SiteSettings } from "@/lib/site-settings-read";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function GalleryDesignCard({
  project,
  busy,
  height,
  categories,
  currentCategoryId,
  onAssignCategory,
  onHide,
  onDragStart,
  onDrop,
}: {
  project: Project;
  busy: boolean;
  height: number;
  categories: Category[];
  currentCategoryId: string | null;
  onAssignCategory: (categoryId: string | null) => void;
  onHide: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <article
      draggable={!busy}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="admin-gallery-card"
      style={{ height, width: "100%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={project.media_url}
        alt={project.title}
        className="admin-gallery-card__img"
        draggable={false}
      />
      <div className="admin-gallery-card__bar">
        <span className="admin-gallery-card__grip" aria-hidden>
          <GripVertical size={12} />
        </span>
        <p className="admin-gallery-card__title">{project.title || "Untitled"}</p>
      </div>
      <div className="admin-gallery-card__actions">
        <Link
          href={`/admin/projects/${project.id}`}
          className="admin-gallery-card__btn"
          title="Edit design"
        >
          <Pencil size={13} />
        </Link>
        <select
          value={currentCategoryId || ""}
          disabled={busy}
          onChange={(e) => onAssignCategory(e.target.value || null)}
          className="admin-gallery-card__select"
          aria-label="Move to section"
        >
          <option value="">Unassigned</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={onHide}
          className="admin-gallery-card__btn admin-gallery-card__btn--muted"
          title="Hide from gallery page"
        >
          <EyeOff size={13} />
        </button>
      </div>
    </article>
  );
}

export default function GalleryManager({
  initialCategories,
  initialProjects,
  gallerySettings,
}: {
  initialCategories: Category[];
  initialProjects: Project[];
  gallerySettings: Pick<
    SiteSettings,
    "designGalleryEyebrow" | "designGalleryTitle" | "designGallerySubtitle"
  >;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [projects, setProjects] = useState(initialProjects);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ sectionId: string; index: number } | null>(null);

  const grouped = useMemo(
    () => groupProjectsForGalleryAdmin(projects, categories),
    [projects, categories]
  );

  async function refetchAll() {
    const [catRes, projRes] = await Promise.all([
      fetch("/api/categories?type=design", { cache: "no-store" }),
      fetch("/api/projects?type=design&admin=true", { cache: "no-store" }),
    ]);
    const cats = await parseResponseJson<Category[]>(catRes);
    const projs = await parseResponseJson<Project[]>(projRes);
    if (Array.isArray(cats)) setCategories(cats);
    if (Array.isArray(projs)) setProjects(projs);
    router.refresh();
  }

  async function updateProject(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await parseResponseJson<Project | { error?: string }>(res);
    if (!res.ok) {
      throw new Error(!("id" in (data as Project)) && (data as { error?: string }).error
        ? (data as { error?: string }).error!
        : "Failed to update design");
    }
    const updated = data as Project;
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }

  async function persistGalleryOrder(sectionProjects: Project[]) {
    const res = await fetch("/api/projects/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "gallery",
        items: buildGalleryReorderItems(sectionProjects),
      }),
      cache: "no-store",
    });
    const data = await parseResponseJson<{ error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to save gallery order");
    await refetchAll();
  }

  async function saveCategory(category: Category) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, description: category.description }),
      });
      const data = await parseResponseJson<Category | { error?: string }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to save section");
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? (data as Category) : c))
      );
      setMessage("Section saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save section");
    } finally {
      setBusy(false);
    }
  }

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSectionName.trim(),
          description: newSectionDesc.trim(),
          project_type: "design",
        }),
      });
      const data = await parseResponseJson<Category | { error?: string }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to add section");
      setNewSectionName("");
      setNewSectionDesc("");
      await refetchAll();
      setMessage("New section added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add section");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSection(id: string) {
    if (!confirm("Delete this section? Designs will move to Unassigned.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to delete section");
      await refetchAll();
      setMessage("Section deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete section");
    } finally {
      setBusy(false);
    }
  }

  async function moveSection(id: string, direction: -1 | 1) {
    const index = categories.findIndex((c) => c.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;
    const next = reorderList(categories, index, target);
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
      const data = await parseResponseJson<Category[] | { error?: string }>(res);
      if (!res.ok || !Array.isArray(data)) {
        throw new Error((data as { error?: string }).error || "Failed to reorder sections");
      }
      setCategories(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder sections");
    } finally {
      setBusy(false);
    }
  }

  async function assignToSection(project: Project, categoryId: string | null) {
    setBusy(true);
    setError("");
    try {
      await updateProject(project.id, {
        category_id: categoryId,
        metadata: { ...project.metadata, showInGallery: true },
      });
      setMessage("Design updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign design");
    } finally {
      setBusy(false);
    }
  }

  async function hideFromGallery(project: Project) {
    setBusy(true);
    setError("");
    try {
      await updateProject(project.id, {
        metadata: { ...project.metadata, showInGallery: false },
      });
      setMessage("Design hidden from gallery.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hide design");
    } finally {
      setBusy(false);
    }
  }

  async function restoreToGallery(project: Project) {
    setBusy(true);
    setError("");
    try {
      await updateProject(project.id, {
        metadata: { ...project.metadata, showInGallery: true },
      });
      setMessage("Design restored to gallery.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore design");
    } finally {
      setBusy(false);
    }
  }

  async function handleDrop(sectionId: string, targetIndex: number, designs: Project[]) {
    if (!drag || drag.sectionId !== sectionId || busy) return;
    if (drag.index === targetIndex) {
      setDrag(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const reordered = reorderList(designs, drag.index, targetIndex);
      setProjects((prev) => {
        const orderIds = new Set(reordered.map((d) => d.id));
        const others = prev.filter((p) => !orderIds.has(p.id));
        return [...others, ...reordered.map((d, i) => ({
          ...d,
          metadata: { ...d.metadata, gallerySortOrder: (i + 1) * 1_000 },
        }))];
      });
      await persistGalleryOrder(reordered);
      setMessage("Gallery order saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
      await refetchAll();
    } finally {
      setBusy(false);
      setDrag(null);
    }
  }

  function assignableDesigns(sectionId: string) {
    return projects.filter(
      (p) => p.metadata?.showInGallery !== false && p.category_id !== sectionId
    );
  }

  function renderSection(
    sectionId: string,
    category: Category | null,
    title: string,
    description: string,
    designs: Project[],
    editable: boolean
  ) {
    const cat = category;
    const sectionIndex = category ? categories.findIndex((c) => c.id === category.id) : -1;

    return (
      <section key={sectionId} className="admin-gallery-section">
        <div className="admin-gallery-section__toolbar">
          {editable && cat ? (
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  disabled={busy || sectionIndex <= 0}
                  onClick={() => moveSection(cat.id, -1)}
                  className="admin-gallery-icon-btn"
                  aria-label="Move section up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={busy || sectionIndex >= categories.length - 1}
                  onClick={() => moveSection(cat.id, 1)}
                  className="admin-gallery-icon-btn"
                  aria-label="Move section down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <input
                  value={cat.name}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((c) => (c.id === cat.id ? { ...c, name: e.target.value } : c))
                    )
                  }
                  className="admin-input font-semibold"
                  placeholder="Section title"
                />
                <textarea
                  value={cat.description || ""}
                  onChange={(e) =>
                    setCategories((prev) =>
                      prev.map((c) =>
                        c.id === cat.id ? { ...c, description: e.target.value } : c
                      )
                    )
                  }
                  className="admin-input min-h-[72px] text-sm"
                  placeholder="Description under the heading (same as live page)"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => saveCategory(cat)}
                    className="admin-btn-secondary text-sm"
                  >
                    <Save size={14} />
                    Save section
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPickerSectionId(pickerSectionId === cat.id ? null : cat.id)}
                    className="admin-btn-secondary text-sm"
                  >
                    <Plus size={14} />
                    Add design
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deleteSection(cat.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    Delete section
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <h2 className="text-white font-semibold text-lg">{title}</h2>
              {description ? <p className="text-zinc-500 text-sm mt-1">{description}</p> : null}
            </div>
          )}
        </div>

        {editable && cat && pickerSectionId === cat.id ? (
          <div className="admin-gallery-picker">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-zinc-300 text-sm font-medium">Add a design to this section</p>
              <button
                type="button"
                onClick={() => setPickerSectionId(null)}
                className="admin-gallery-icon-btn"
                aria-label="Close picker"
              >
                <X size={14} />
              </button>
            </div>
            {assignableDesigns(cat.id).length === 0 ? (
              <p className="text-zinc-500 text-sm">
                No other designs available.{" "}
                <Link href="/admin/projects/new?type=design" className="text-purple-400 hover:underline">
                  Upload a new design
                </Link>
              </p>
            ) : (
              <div className="admin-gallery-picker__grid">
                {assignableDesigns(cat.id).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    disabled={busy}
                    onClick={() => assignToSection(project, cat.id)}
                    className="admin-gallery-picker__item"
                    style={{
                      width: 88 * galleryWidthOverHeight(project),
                      height: 88,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={project.media_url} alt={project.title} className="admin-gallery-picker__img" />
                    <span className="admin-gallery-picker__label">{project.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="admin-gallery-preview">
          <div className="design-gallery-section__header admin-gallery-preview__header">
            <div className="design-gallery-section__line" />
            <div>
              <h2 className="design-gallery-section__title">
                {editable && cat ? cat.name : title}
              </h2>
              {(editable && cat ? cat.description : description) ? (
                <p className="design-gallery-section__desc">
                  {editable && cat ? cat.description : description}
                </p>
              ) : null}
            </div>
          </div>

          {designs.length === 0 ? (
            <div className="admin-gallery-empty">
              <p>No designs in this section yet.</p>
              {editable && cat ? (
                <button
                  type="button"
                  onClick={() => setPickerSectionId(cat.id)}
                  className="admin-btn-primary text-sm mt-3"
                >
                  <Plus size={14} />
                  Add design
                </button>
              ) : null}
            </div>
          ) : (
            <DesignGalleryJustifiedGrid
              items={designs}
              renderCard={(project, { height }) => {
                const index = designs.findIndex((d) => d.id === project.id);
                return (
                  <GalleryDesignCard
                    key={project.id}
                    project={project}
                    busy={busy}
                    height={height}
                    categories={categories}
                    currentCategoryId={cat?.id ?? null}
                    onAssignCategory={(categoryId) => assignToSection(project, categoryId)}
                    onHide={() => hideFromGallery(project)}
                    onDragStart={() => setDrag({ sectionId, index })}
                    onDrop={() => handleDrop(sectionId, index, designs)}
                  />
                );
              }}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Live gallery preview</h2>
            <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
              Sections below match the white <span className="text-zinc-300">/designs</span> page —
              same layout and image proportions. Homepage marquee is managed separately under Designs.
            </p>
            <div className="mt-3 text-sm text-zinc-400 space-y-1">
              <p>
                <span className="text-purple-400 uppercase text-xs tracking-wider">
                  {gallerySettings.designGalleryEyebrow}
                </span>
              </p>
              <p className="text-white font-semibold">{gallerySettings.designGalleryTitle}</p>
              <p className="text-zinc-500">{gallerySettings.designGallerySubtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/designs" target="_blank" className="admin-btn-secondary text-sm">
              <ExternalLink size={14} />
              View live page
            </Link>
            <Link href="/admin/settings" className="admin-btn-secondary text-sm">
              <Settings size={14} />
              Edit page title
            </Link>
            <Link href="/admin/projects/new?type=design" className="admin-btn-primary text-sm">
              <Plus size={14} />
              Upload design
            </Link>
          </div>
        </div>
      </div>

      {(error || message) && (
        <p
          className={`text-sm px-3 py-2 rounded-lg border ${
            error
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-green-400 bg-green-500/10 border-green-500/20"
          }`}
        >
          {error || message}
        </p>
      )}

      {grouped.sections.map(({ category, designs }) =>
        renderSection(category.id, category, category.name, category.description || "", designs, true)
      )}

      {grouped.unassigned.length > 0
        ? renderSection(
            "unassigned",
            null,
            "Unassigned",
            "Designs on the gallery page but not in a section yet (shown as More Designs).",
            grouped.unassigned,
            false
          )
        : (
          <section className="admin-gallery-section">
            <div className="admin-gallery-section__toolbar">
              <div>
                <h2 className="text-white font-semibold text-lg">Unassigned</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  All designs are in sections. Add a new design or move one from a section dropdown.
                </p>
              </div>
            </div>
          </section>
        )}

      {grouped.hidden.length > 0 ? (
        <section className="admin-gallery-section">
          <div className="admin-gallery-section__toolbar">
            <div>
              <h2 className="text-white font-semibold text-lg">Hidden from gallery</h2>
              <p className="text-zinc-500 text-sm mt-1">
                These designs do not appear on /designs. Restore or edit them below.
              </p>
            </div>
          </div>
          <div className="admin-gallery-hidden-grid">
            {grouped.hidden.map((project) => (
              <div key={project.id} className="admin-gallery-hidden-card">
                <div
                  className="admin-gallery-hidden-card__thumb"
                  style={{
                    height: 96,
                    width: 96 * galleryWidthOverHeight(project),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.media_url} alt={project.title} className="admin-gallery-card__img" />
                </div>
                <p className="text-white text-xs font-medium truncate mt-2">{project.title}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => restoreToGallery(project)}
                    className="admin-btn-secondary text-xs flex-1 justify-center"
                  >
                    Restore
                  </button>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="admin-btn-secondary text-xs px-2"
                  >
                    <Pencil size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <form onSubmit={addSection} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h3 className="text-white font-medium">Add new section</h3>
        <p className="text-zinc-500 text-sm">
          e.g. Food Menu, Pull Up Banner, Movie Tickets — appears as a heading on the designs page.
        </p>
        <input
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          className="admin-input"
          placeholder="Section title"
        />
        <textarea
          value={newSectionDesc}
          onChange={(e) => setNewSectionDesc(e.target.value)}
          className="admin-input min-h-[80px]"
          placeholder="Short description (optional)"
        />
        <button type="submit" disabled={busy || !newSectionName.trim()} className="admin-btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add section
        </button>
      </form>
    </div>
  );
}
