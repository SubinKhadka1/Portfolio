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
  Star,
  Trash2,
  X,
} from "lucide-react";
import DesignGalleryJustifiedGrid from "@/components/DesignGalleryJustifiedGrid";
import SectionDesignUpload from "@/components/admin/SectionDesignUpload";
import { buildGalleryDesignReorderItems } from "@/lib/reorder-payload";
import { groupDesignsForGalleryAdmin } from "@/lib/gallery-admin";
import { galleryDesignToLayoutItem } from "@/lib/design-module-mappers";
import { galleryWidthOverHeight } from "@/lib/design-gallery-layout";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category, GalleryDesign } from "@/lib/types/database";
import type { SiteSettings } from "@/lib/site-settings-read";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function nextGallerySortOrder(designs: GalleryDesign[]) {
  const max = designs.reduce((highest, design) => Math.max(highest, design.sort_order), 0);
  return max + 1_000;
}

type GalleryDrag = {
  projectId: string;
  sectionId: string;
  index: number;
};

type DragOverTarget = {
  sectionId: string;
  index: number;
  side: "before" | "after";
};

function GalleryDesignCard({
  design,
  busy,
  height,
  categories,
  currentCategoryId,
  isDragging,
  dropHint,
  onAssignCategory,
  onHide,
  onRemoveFromSection,
  onFeatureHomepage,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  design: GalleryDesign;
  busy: boolean;
  height: number;
  categories: Category[];
  currentCategoryId: string | null;
  isDragging: boolean;
  dropHint: "before" | "after" | null;
  onAssignCategory: (categoryId: string | null) => void;
  onHide: () => void;
  onRemoveFromSection: () => void;
  onFeatureHomepage: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <article
      draggable={!busy}
      onDragStart={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, select, a, input, textarea")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", design.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`admin-gallery-card${isDragging ? " admin-gallery-card--dragging" : ""}${
        dropHint === "before" ? " admin-gallery-card--drop-before" : ""
      }${dropHint === "after" ? " admin-gallery-card--drop-after" : ""}`}
      style={{ height, width: "100%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={design.media_url}
        alt={design.title}
        className="admin-gallery-card__img"
        draggable={false}
      />
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          onRemoveFromSection();
        }}
        className="admin-gallery-card__remove"
        title={currentCategoryId ? "Remove from this section" : "Remove from gallery"}
        aria-label={currentCategoryId ? "Remove from this section" : "Remove from gallery"}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      <div className="admin-gallery-card__bar">
        <span className="admin-gallery-card__grip" data-gallery-drag-handle aria-hidden>
          <GripVertical size={12} />
        </span>
        <p className="admin-gallery-card__title">{design.title || "Untitled"}</p>
      </div>
      <div className="admin-gallery-card__actions">
        <Link
          href={`/admin/gallery-designs/${design.id}`}
          className="admin-gallery-card__btn"
          title="Edit design"
        >
          <Pencil size={13} />
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={onFeatureHomepage}
          className="admin-gallery-card__btn"
          title="Feature on Homepage (creates independent copy)"
        >
          <Star size={13} />
        </button>
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
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="admin-gallery-card__btn admin-gallery-card__btn--muted"
          title="Delete from gallery only"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  );
}

export default function GalleryManager({
  initialCategories,
  initialDesigns,
  gallerySettings,
}: {
  initialCategories: Category[];
  initialDesigns: GalleryDesign[];
  gallerySettings: Pick<
    SiteSettings,
    "designGalleryEyebrow" | "designGalleryTitle" | "designGallerySubtitle"
  >;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [designs, setDesigns] = useState(initialDesigns);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [drag, setDrag] = useState<GalleryDrag | null>(null);
  const [dragOver, setDragOver] = useState<DragOverTarget | null>(null);

  const grouped = useMemo(
    () => groupDesignsForGalleryAdmin(designs, categories),
    [designs, categories]
  );

  async function refetchAll() {
    const [catRes, designRes] = await Promise.all([
      fetch("/api/categories?type=design", { cache: "no-store" }),
      fetch("/api/gallery-designs?admin=true", { cache: "no-store" }),
    ]);
    const cats = await parseResponseJson<Category[]>(catRes);
    const list = await parseResponseJson<GalleryDesign[]>(designRes);
    if (Array.isArray(cats)) setCategories(cats);
    if (Array.isArray(list)) setDesigns(list);
    router.refresh();
  }

  async function updateDesign(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/gallery-designs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await parseResponseJson<GalleryDesign | { error?: string }>(res);
    if (!res.ok) {
      throw new Error(!("id" in (data as GalleryDesign)) && (data as { error?: string }).error
        ? (data as { error?: string }).error!
        : "Failed to update design");
    }
    const updated = data as GalleryDesign;
    setDesigns((prev) => prev.map((d) => (d.id === id ? updated : d)));
    return updated;
  }

  async function persistGalleryOrder(sectionDesigns: GalleryDesign[]) {
    const res = await fetch("/api/gallery-designs/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: buildGalleryDesignReorderItems(sectionDesigns),
      }),
      cache: "no-store",
    });
    const data = await parseResponseJson<{ error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to save gallery order");
    await refetchAll();
  }

  async function deleteFromGallery(design: GalleryDesign) {
    if (
      !confirm(
        "This will remove the design from the Gallery only.\nHomepage portfolio sections will remain unchanged."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/gallery-designs/${design.id}`, { method: "DELETE" });
      const data = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to delete design");
      setDesigns((prev) => prev.filter((d) => d.id !== design.id));
      setMessage("Design removed from gallery. Homepage content unchanged.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete design");
    } finally {
      setBusy(false);
    }
  }

  async function featureOnHomepage(design: GalleryDesign) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/homepage-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_gallery_id: design.id }),
      });
      const data = await parseResponseJson<{ id?: string; error?: string }>(res);
      if (!res.ok || !data.id) {
        throw new Error(data.error || "Failed to feature on homepage");
      }
      setMessage(
        `"${design.title || "Design"}" copied to homepage marquee. Gallery and homepage stay independent.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to feature on homepage");
    } finally {
      setBusy(false);
    }
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

  async function moveToUnassigned(design: GalleryDesign) {
    setBusy(true);
    setError("");
    try {
      await updateDesign(design.id, {
        category_id: null,
        metadata: { ...design.metadata, galleryHidden: false },
      });
      setMessage("Moved to Unassigned.");
      await refetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move design");
    } finally {
      setBusy(false);
    }
  }

  async function assignToSection(design: GalleryDesign, categoryId: string) {
    if (design.category_id === categoryId) return;

    setBusy(true);
    setError("");
    try {
      const updated = await updateDesign(design.id, {
        category_id: categoryId,
        metadata: { ...design.metadata, galleryHidden: false },
      });
      if (updated.category_id !== categoryId) {
        throw new Error("Section assignment did not save. Please try again.");
      }
      setMessage(`Added to this section only. Drag to reorder when ready.`);
      await refetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign design");
    } finally {
      setBusy(false);
    }
  }

  async function removeFromSection(
    design: GalleryDesign,
    sectionCategoryId: string | null,
    sectionName?: string
  ) {
    if (sectionCategoryId) {
      setBusy(true);
      setError("");
      try {
        await updateDesign(design.id, {
          category_id: null,
          metadata: { ...design.metadata, galleryHidden: false },
        });
        setMessage(`Removed from ${sectionName || "section"}.`);
        await refetchAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove design");
      } finally {
        setBusy(false);
      }
      return;
    }
    await hideFromGallery(design);
  }

  async function hideFromGallery(design: GalleryDesign) {
    setBusy(true);
    setError("");
    try {
      await updateDesign(design.id, {
        metadata: { ...design.metadata, galleryHidden: true },
      });
      setMessage("Design hidden from gallery.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hide design");
    } finally {
      setBusy(false);
    }
  }

  async function restoreToGallery(design: GalleryDesign) {
    setBusy(true);
    setError("");
    try {
      await updateDesign(design.id, {
        metadata: { ...design.metadata, galleryHidden: false },
      });
      setMessage("Design restored to gallery.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore design");
    } finally {
      setBusy(false);
    }
  }

  function clearDrag() {
    setDrag(null);
    setDragOver(null);
  }

  async function handleGalleryDrop(
    targetSectionId: string,
    targetIndex: number,
    side: "before" | "after",
    targetDesigns: GalleryDesign[],
    targetCategoryId: string | null
  ) {
    if (!drag || busy) return;

    let insertAt = side === "after" ? targetIndex + 1 : targetIndex;

    if (drag.sectionId === targetSectionId) {
      const from = drag.index;
      let to = insertAt;
      if (from < to) to -= 1;
      if (from === to) {
        clearDrag();
        return;
      }

      setBusy(true);
      setError("");
      try {
        const reordered = reorderList(targetDesigns, from, to);
        setDesigns((prev) => {
          const orderIds = new Set(reordered.map((d) => d.id));
          const others = prev.filter((d) => !orderIds.has(d.id));
          return [
            ...others,
            ...reordered.map((d, i) => ({
              ...d,
              sort_order: (i + 1) * 1_000,
            })),
          ];
        });
        await persistGalleryOrder(reordered);
        setMessage("Design order saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reorder");
        await refetchAll();
      } finally {
        setBusy(false);
        clearDrag();
      }
      return;
    }

    const design = designs.find((d) => d.id === drag.projectId);
    if (!design) {
      clearDrag();
      return;
    }

    setBusy(true);
    setError("");
    try {
      const targetList = targetDesigns.filter((d) => d.id !== design.id);
      const to = Math.min(insertAt, targetList.length);
      targetList.splice(to, 0, design);

      await updateDesign(design.id, {
        category_id: targetCategoryId,
        metadata: { ...design.metadata, galleryHidden: false },
      });

      setDesigns((prev) =>
        prev.map((d) =>
          d.id === design.id ? { ...d, category_id: targetCategoryId } : d
        )
      );

      await persistGalleryOrder(targetList);
      setMessage(`Moved to ${targetCategoryId ? "section" : "unassigned"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move design");
      await refetchAll();
    } finally {
      setBusy(false);
      clearDrag();
    }
  }

  function handleUploadComplete(
    categoryId: string,
    result: { created: GalleryDesign[]; failed: { name: string; error: string }[] }
  ) {
    if (result.created.length) {
      setDesigns((prev) => {
        const ids = new Set(result.created.map((d) => d.id));
        const others = prev.filter((d) => !ids.has(d.id));
        return [...others, ...result.created.map((d) => ({ ...d, category_id: categoryId }))];
      });
    }

    if (result.created.length && !result.failed.length) {
      setMessage(
        result.created.length === 1
          ? "1 design uploaded to this section. Drag to reorder if needed."
          : `${result.created.length} designs uploaded to this section. Drag to reorder if needed.`
      );
      setError("");
    } else if (result.created.length && result.failed.length) {
      setMessage(`${result.created.length} added. ${result.failed.length} failed — see upload box for details.`);
      setError("");
    } else if (result.failed.length) {
      setError(result.failed[0]?.error || "Upload failed");
    }

    if (result.created.length) {
      void refetchAll();
    }
  }

  function unassignedDesigns() {
    return designs.filter(
      (d) => d.metadata?.galleryHidden !== true && !d.category_id
    );
  }

  function renderSection(
    sectionId: string,
    category: Category | null,
    title: string,
    description: string,
    sectionDesigns: GalleryDesign[],
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
                <p className="text-zinc-500 text-xs">
                  {sectionDesigns.length} design{sectionDesigns.length === 1 ? "" : "s"} in this section only
                </p>
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
                    Add / upload
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
              <p className="text-zinc-300 text-sm font-medium">Add designs to {cat.name}</p>
              <button
                type="button"
                onClick={() => setPickerSectionId(null)}
                className="admin-gallery-icon-btn"
                aria-label="Close picker"
              >
                <X size={14} />
              </button>
            </div>

            <SectionDesignUpload
              categoryId={cat.id}
              categoryName={cat.name}
              startSortOrder={nextGallerySortOrder(sectionDesigns)}
              disabled={busy}
              onComplete={(result) => handleUploadComplete(cat.id, result)}
            />

            {unassignedDesigns().length > 0 ? (
              <>
                <p className="text-zinc-500 text-xs mt-4 mb-2">
                  Or pick an unassigned design to add here
                </p>
                <div className="admin-gallery-picker__grid">
                  {unassignedDesigns().map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={busy}
                      onClick={() => assignToSection(item, cat.id)}
                      className="admin-gallery-picker__item"
                      style={{
                        width: 88 * galleryWidthOverHeight({ metadata: item.metadata }),
                        height: 88,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.media_url} alt={item.title} className="admin-gallery-picker__img" />
                      <span className="admin-gallery-picker__label">{item.title}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-xs mt-4">
                No unassigned designs. Upload new images above, or drag a design here from another
                section.
              </p>
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

          {sectionDesigns.length === 0 ? (
            <div className="admin-gallery-empty">
              <p>No designs in this section yet.</p>
              {editable && cat ? (
                <div className="mt-4 max-w-md mx-auto space-y-3">
                  <SectionDesignUpload
                    categoryId={cat.id}
                    categoryName={cat.name}
                    startSortOrder={1_000}
                    disabled={busy}
                    onComplete={(result) => handleUploadComplete(cat.id, result)}
                  />
                  <button
                    type="button"
                    onClick={() => setPickerSectionId(cat.id)}
                    className="admin-btn-secondary text-sm w-full justify-center"
                  >
                    <Plus size={14} />
                    Add existing design
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <DesignGalleryJustifiedGrid
              items={sectionDesigns.map(galleryDesignToLayoutItem)}
              renderCard={(item, { height }) => {
                const design = sectionDesigns.find((d) => d.id === item.id)!;
                const index = sectionDesigns.findIndex((d) => d.id === item.id);
                const isDragging = drag?.projectId === item.id;
                const dropHint =
                  dragOver?.sectionId === sectionId && dragOver.index === index
                    ? dragOver.side
                    : null;

                return (
                  <GalleryDesignCard
                    key={item.id}
                    design={design}
                    busy={busy}
                    height={height}
                    categories={categories}
                    currentCategoryId={cat?.id ?? null}
                    isDragging={isDragging}
                    dropHint={dropHint}
                    onAssignCategory={(categoryId) => {
                      if (!categoryId) {
                        void moveToUnassigned(design);
                      } else if (categoryId !== cat?.id) {
                        void assignToSection(design, categoryId);
                      }
                    }}
                    onHide={() => hideFromGallery(design)}
                    onRemoveFromSection={() =>
                      removeFromSection(design, cat?.id ?? null, cat?.name ?? title)
                    }
                    onFeatureHomepage={() => featureOnHomepage(design)}
                    onDelete={() => deleteFromGallery(design)}
                    onDragStart={() =>
                      setDrag({ projectId: item.id, sectionId, index })
                    }
                    onDragEnd={clearDrag}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const side =
                        e.clientX < rect.left + rect.width / 2 ? "before" : "after";
                      setDragOver({ sectionId, index, side });
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOver((prev) =>
                          prev?.sectionId === sectionId && prev.index === index ? null : prev
                        );
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const side =
                        dragOver?.sectionId === sectionId && dragOver.index === index
                          ? dragOver.side
                          : "before";
                      void handleGalleryDrop(
                        sectionId,
                        index,
                        side,
                        sectionDesigns,
                        cat?.id ?? null
                      );
                    }}
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
              Gallery CMS is independent from homepage sections. Drag any card to reorder within a
              section, or use the section dropdown to move it. Re-upload old designs to remove baked-in
              white borders from earlier uploads.
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
            <Link href="/admin/projects?type=design" className="admin-btn-primary text-sm">
              <Plus size={14} />
              Add to homepage
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
            {grouped.hidden.map((item) => (
              <div key={item.id} className="admin-gallery-hidden-card">
                <div
                  className="admin-gallery-hidden-card__thumb"
                  style={{
                    height: 96,
                    width: 96 * galleryWidthOverHeight({ metadata: item.metadata }),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.media_url} alt={item.title} className="admin-gallery-card__img" />
                </div>
                <p className="text-white text-xs font-medium truncate mt-2">{item.title}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => restoreToGallery(item)}
                    className="admin-btn-secondary text-xs flex-1 justify-center"
                  >
                    Restore
                  </button>
                  <Link
                    href={`/admin/gallery-designs/${item.id}`}
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
