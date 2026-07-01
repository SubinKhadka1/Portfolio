"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import GallerySectionsEditor from "@/components/admin/gallery-manager/GallerySectionsEditor";
import GalleryDesignCard from "@/components/admin/gallery-manager/GalleryDesignCard";
import GalleryPropertiesPanel from "@/components/admin/gallery-manager/GalleryPropertiesPanel";
import DesignGalleryJustifiedGrid from "@/components/DesignGalleryJustifiedGrid";
import {
  gridSizeToZoom,
  isImageFile,
  nextSortOrder,
  zoomToRowHeights,
  type GridSize,
  type SortMode,
} from "@/components/admin/gallery-manager/types";
import { prepareGalleryDesignUpload } from "@/lib/compress-design-image";
import { groupGalleryDesignsByCategory } from "@/lib/design-gallery";
import { uploadDesignsToSection } from "@/lib/gallery-design-create";
import { buildGalleryDesignReorderItems } from "@/lib/reorder-payload";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category, GalleryDesign } from "@/lib/types/database";
import type { SiteSettings } from "@/lib/site-settings-read";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp,.svg";

export default function GalleryManagerApp({
  initialCategories,
  initialDesigns,
  initialCategoryFilter = "all",
}: {
  initialCategories: Category[];
  initialDesigns: GalleryDesign[];
  initialCategoryFilter?: string;
  gallerySettings: Pick<
    SiteSettings,
    "designGalleryEyebrow" | "designGalleryTitle" | "designGallerySubtitle"
  >;
}) {
  const snapshotRef = useRef(JSON.stringify(initialDesigns));
  const [categories, setCategories] = useState(initialCategories);
  const [designs, setDesigns] = useState(initialDesigns);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [sort] = useState<SortMode>("order");
  const [gridLayout, setGridLayout] = useState<GridSize>("medium");
  const [zoom, setZoom] = useState(gridSizeToZoom("medium"));
  const [editGrid, setEditGrid] = useState(false);
  const [editSections, setEditSections] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelDraft, setPanelDraft] = useState<GalleryDesign | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(categories[0]?.id || "");
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceDesignId = useRef<string | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const packOptions = useMemo(() => zoomToRowHeights(zoom), [zoom]);

  const isDirty = useMemo(() => {
    if (JSON.stringify(designs) !== snapshotRef.current) return true;
    if (!panelDraft || !selectedId) return false;
    const saved = designs.find((d) => d.id === selectedId);
    if (!saved) return false;
    return JSON.stringify(panelDraft) !== JSON.stringify(saved);
  }, [designs, panelDraft, selectedId]);

  const flash = useCallback((msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage("");
    } else {
      setMessage(msg);
      setError("");
    }
    setTimeout(() => {
      setMessage("");
      setError("");
    }, 3500);
  }, []);

  const markPending = (ids: string[], on: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = designs.filter((d) => !d.metadata?.galleryHidden);

    if (categoryFilter !== "all") {
      if (categoryFilter === "uncategorized") list = list.filter((d) => !d.category_id);
      else list = list.filter((d) => d.category_id === categoryFilter);
    }

    if (q) {
      list = list.filter((d) => {
        const cat = d.category_id ? categoryMap.get(d.category_id)?.name : "";
        return (
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (cat || "").toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort((a, b) => a.sort_order - b.sort_order);
  }, [designs, search, categoryFilter, categoryMap]);

  const visible = filtered;

  const adminSections = useMemo(() => {
    if (categoryFilter !== "all" || search.trim()) return null;
    return groupGalleryDesignsByCategory(filtered, categories);
  }, [categoryFilter, search, filtered, categories]);

  const renderAdminCard = (design: GalleryDesign, height: number, dragging: boolean) => (
    <GalleryDesignCard
      design={design}
      height={height}
      active={selectedId === design.id}
      busy={pendingIds.has(design.id) || dragging}
      editMode={editGrid}
      onSelect={() => selectDesign(design)}
      onEdit={() => selectDesign(design)}
      onReplace={() => {
        replaceDesignId.current = design.id;
        replaceRef.current?.click();
      }}
      onDuplicate={() => duplicateDesign(design.id)}
      onDelete={() => deleteDesign(design.id)}
      onToggleFeatured={() =>
        void patchDesign(design.id, {
          metadata: { ...design.metadata, featured: !design.metadata?.featured },
        })
      }
    />
  );

  const selectDesign = (design: GalleryDesign) => {
    setSelectedId(design.id);
    setPanelDraft({ ...design });
  };

  const closePanel = () => {
    setSelectedId(null);
    setPanelDraft(null);
  };

  const patchDesign = async (id: string, patch: Record<string, unknown>) => {
    markPending([id], true);
    try {
      const res = await fetch(`/api/gallery-designs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        cache: "no-store",
      });
      const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDesigns((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      if (selectedId === data.id) setPanelDraft({ ...data });
      return data;
    } finally {
      markPending([id], false);
    }
  };

  const savePanel = async () => {
    if (!panelDraft) return;
    setSaving(true);
    try {
      await patchDesign(panelDraft.id, {
        title: panelDraft.title,
        description: panelDraft.description,
        category_id: panelDraft.category_id,
        published: panelDraft.published,
        metadata: panelDraft.metadata,
      });
      snapshotRef.current = JSON.stringify(
        designs.map((d) => (d.id === panelDraft.id ? panelDraft : d))
      );
      flash("Design saved.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed", true);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (panelDraft && selectedId) {
        await patchDesign(panelDraft.id, {
          title: panelDraft.title,
          description: panelDraft.description,
          category_id: panelDraft.category_id,
          published: panelDraft.published,
          metadata: panelDraft.metadata,
        });
      }
      snapshotRef.current = JSON.stringify(designs);
      flash("Changes saved.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed", true);
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    const restored = JSON.parse(snapshotRef.current) as GalleryDesign[];
    setDesigns(restored);
    closePanel();
    setShowUpload(false);
    flash("Changes discarded.");
  };

  const runUpload = async (files: File[]) => {
    const allowed = files.filter(isImageFile);
    if (!allowed.length) {
      flash("Please choose PNG, JPG, WebP, or SVG images.", true);
      return;
    }
    setUploading(true);
    setUploadProgress(`Uploading ${allowed.length} file${allowed.length === 1 ? "" : "s"}…`);
    try {
      const result = await uploadDesignsToSection({
        files: allowed,
        categoryId: uploadCategory || null,
        startSortOrder: nextSortOrder(designs),
        onProgress: setUploadProgress,
      });
      if (result.created.length) {
        setDesigns((prev) => {
          const next = [...prev, ...result.created].sort((a, b) => a.sort_order - b.sort_order);
          snapshotRef.current = JSON.stringify(next);
          return next;
        });
        flash(`${result.created.length} design${result.created.length === 1 ? "" : "s"} added.`);
        setShowUpload(false);
        if (result.created[0]) selectDesign(result.created[0]);
      }
      if (result.failed.length) flash(`${result.failed.length} failed.`, true);
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteDesign = async (id: string) => {
    if (!confirm("Delete this design permanently?")) return;
    markPending([id], true);
    try {
      const res = await fetch("/api/gallery-designs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: [id] }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDesigns((prev) => prev.filter((d) => d.id !== id));
      if (selectedId === id) closePanel();
      flash("Design deleted.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed", true);
    } finally {
      markPending([id], false);
    }
  };

  const duplicateDesign = async (id: string) => {
    markPending([id], true);
    try {
      const res = await fetch(`/api/gallery-designs/${id}/duplicate`, { method: "POST", cache: "no-store" });
      const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      setDesigns((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      selectDesign(data);
      flash("Duplicated.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Duplicate failed", true);
    } finally {
      markPending([id], false);
    }
  };

  const saveReorder = async (ordered: GalleryDesign[]) => {
    const items = buildGalleryDesignReorderItems(ordered);
    const orderMap = new Map(items.map((i) => [i.id, i.sort_order]));
    setDesigns((prev) =>
      prev
        .map((d) => (orderMap.has(d.id) ? { ...d, sort_order: orderMap.get(d.id)! } : d))
        .sort((a, b) => a.sort_order - b.sort_order)
    );
    try {
      await fetch("/api/gallery-designs/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        cache: "no-store",
      });
    } catch {
      flash("Reorder save failed", true);
    }
  };

  const saveSectionReorder = (sectionDesigns: GalleryDesign[], ordered: GalleryDesign[]) => {
    const sectionIdSet = new Set(sectionDesigns.map((d) => d.id));
    const sectionInDesigns = designs.filter((d) => sectionIdSet.has(d.id));
    if (!sectionInDesigns.length) return;

    const firstOrder = Math.min(...sectionInDesigns.map((d) => d.sort_order));
    const others = designs
      .filter((d) => !sectionIdSet.has(d.id))
      .sort((a, b) => a.sort_order - b.sort_order);
    const before = others.filter((d) => d.sort_order < firstOrder);
    const after = others.filter((d) => d.sort_order >= firstOrder);
    void saveReorder([...before, ...ordered, ...after]);
  };

  const replaceImage = async (designId: string, file: File) => {
    markPending([designId], true);
    try {
      const prepared = await prepareGalleryDesignUpload(file);
      const formData = new FormData();
      formData.append("file", prepared.file);
      formData.append("type", "design");
      const up = await fetch("/api/upload", { method: "POST", body: formData, cache: "no-store" });
      const upData = await parseResponseJson<{ url?: string; error?: string }>(up);
      if (!up.ok || !upData.url) throw new Error(upData.error || "Upload failed");
      const data = await patchDesign(designId, {
        media_url: upData.url,
        metadata: {
          imageWidth: prepared.width,
          imageHeight: prepared.height,
          aspectRatio: prepared.aspectRatio,
        },
      });
      if (data) flash("Image replaced.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Replace failed", true);
    } finally {
      markPending([designId], false);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  };

  const onGridLayoutChange = (size: GridSize) => {
    setGridLayout(size);
    setZoom(gridSizeToZoom(size));
  };

  const sortIndex = panelDraft ? filtered.findIndex((d) => d.id === panelDraft.id) : -1;

  return (
    <div className={`be${selectedId ? " be--panel-open" : ""}`}>
      <header className="be-topnav">
        <div className="be-topnav__left">
          <h1 className="be-topnav__title">Design Gallery Editor</h1>
        </div>
        <div className="be-topnav__center">
          {searchOpen ? (
            <div className="be-topnav__search">
              <Search size={16} />
              <input
                type="search"
                autoFocus
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search designs…"
                className="be-topnav__search-input"
              />
              <button type="button" onClick={() => { setSearchOpen(false); setSearch(""); }} aria-label="Close search">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button type="button" className="be-topnav__icon" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search size={18} />
            </button>
          )}
          <button
            type="button"
            className={`be-btn be-btn--ghost${editSections ? " be-btn--toggle-active" : ""}`}
            onClick={() => setEditSections((v) => !v)}
            aria-pressed={editSections}
          >
            <ListOrdered size={15} />
            {editSections ? "Done" : "Sections"}
          </button>
          <button
            type="button"
            className={`be-btn be-btn--ghost${editGrid ? " be-btn--toggle-active" : ""}`}
            onClick={() => setEditGrid((v) => !v)}
            aria-pressed={editGrid}
          >
            <LayoutGrid size={15} />
            {editGrid ? "Done editing" : "Edit Grid"}
          </button>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
            }}
            className="be-topnav__select"
            aria-label="Category filter"
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="be-topnav__right">
          <button type="button" className="be-btn be-btn--ghost" onClick={() => setShowUpload(true)}>
            Add Designs
          </button>
          <button type="button" className="be-btn be-btn--ghost" onClick={cancelChanges} disabled={!isDirty}>
            Cancel
          </button>
          <button
            type="button"
            className="be-btn be-btn--save"
            onClick={saveAll}
            disabled={!isDirty || saving}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </header>

      {(message || error) && (
        <div className={`be-toast${error ? " be-toast--error" : ""}`}>{error || message}</div>
      )}

      <div className="be-workspace">
        <main className="be-canvas">
          <div className={`be-zoom${editGrid ? " be-zoom--active" : ""}`}>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0, z - 10))}
              className="be-zoom__btn"
              aria-label="Zoom out"
              disabled={!editGrid}
            >
              <Minus size={16} />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="be-zoom__slider"
              aria-label="Row size"
              disabled={!editGrid}
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(100, z + 10))}
              className="be-zoom__btn"
              aria-label="Zoom in"
              disabled={!editGrid}
            >
              <Plus size={16} />
            </button>
            <select
              value={gridLayout}
              onChange={(e) => onGridLayoutChange(e.target.value as GridSize)}
              className="be-zoom__preset"
              aria-label="Grid preset"
              disabled={!editGrid}
            >
              <option value="small">Compact</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            {editGrid ? (
              <span className="be-zoom__hint">Drag designs to reorder · adjust row size</span>
            ) : (
              <span className="be-zoom__label">Behance layout</span>
            )}
          </div>

          {showUpload && (
            <div className="be-upload">
              <div className="be-upload__head">
                <p>Add designs</p>
                <button type="button" onClick={() => setShowUpload(false)} aria-label="Close upload">
                  <X size={18} />
                </button>
              </div>
              <label className="be-field be-upload__cat">
                <span>Category</span>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="be-field__input"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
                onDragEnter={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (!uploading) void runUpload(Array.from(e.dataTransfer.files || []));
                }}
                className={`be-upload__zone${dragging ? " be-upload__zone--active" : ""}`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={28} className="animate-spin" />
                    <p>{uploadProgress}</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} />
                    <p>Drag & drop images here</p>
                    <span>PNG · JPG · WebP · SVG · any dimensions</span>
                  </>
                )}
              </button>
            </div>
          )}

          {editSections ? (
            <GallerySectionsEditor
              categories={categories}
              onChange={setCategories}
              onSaved={flash}
            />
          ) : null}

          <div className="be-scroll">
            {visible.length > 0 ? (
              adminSections ? (
                <div className="be-sections">
                  {adminSections.map((section) => (
                    <section key={section.id} className="be-section">
                      <h2 className="be-section__title">{section.title}</h2>
                      <DesignGalleryJustifiedGrid
                        items={section.designs}
                        className="bh-rows"
                        packOptions={packOptions}
                        stackMode={false}
                        dragDisabled={!editGrid || sort !== "order"}
                        onReorder={(ordered) => saveSectionReorder(section.designs, ordered)}
                        renderCard={(design, { height, dragging }) =>
                          renderAdminCard(design, height, dragging)
                        }
                      />
                    </section>
                  ))}
                </div>
              ) : (
                <DesignGalleryJustifiedGrid
                  items={visible}
                  className="bh-rows"
                  packOptions={packOptions}
                  stackMode={false}
                  dragDisabled={!editGrid || sort !== "order"}
                  onReorder={saveReorder}
                  renderCard={(design, { height, dragging }) =>
                    renderAdminCard(design, height, dragging)
                  }
                />
              )
            ) : (
              <div className="be-empty">
                <p>No designs yet.</p>
                <button type="button" className="be-btn be-btn--save" onClick={() => setShowUpload(true)}>
                  Add Designs
                </button>
              </div>
            )}
          </div>
        </main>

        {panelDraft && selectedId ? (
          <GalleryPropertiesPanel
            draft={panelDraft}
            categories={categories}
            busy={pendingIds.has(panelDraft.id) || saving}
            sortIndex={sortIndex >= 0 ? sortIndex : 0}
            onChange={setPanelDraft}
            onReplace={() => {
              replaceDesignId.current = panelDraft.id;
              replaceRef.current?.click();
            }}
            onDelete={() => deleteDesign(panelDraft.id)}
            onSave={savePanel}
            onClose={closePanel}
          />
        ) : null}
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = replaceDesignId.current;
          if (file && id) void replaceImage(id, file);
        }}
      />
    </div>
  );
}
