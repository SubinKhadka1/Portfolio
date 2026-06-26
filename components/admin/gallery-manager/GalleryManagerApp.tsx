"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  FolderOpen,
  Grid3x3,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import GalleryDesignCard from "@/components/admin/gallery-manager/GalleryDesignCard";
import GalleryMasonryGrid from "@/components/admin/gallery-manager/GalleryMasonryGrid";
import {
  PAGE_SIZE,
  isImageFile,
  nextSortOrder,
  type GalleryView,
  type GridSize,
  type SortMode,
} from "@/components/admin/gallery-manager/types";
import { prepareGalleryDesignUpload } from "@/lib/compress-design-image";
import { uploadDesignsToSection } from "@/lib/gallery-design-create";
import { buildGalleryDesignReorderItems } from "@/lib/reorder-payload";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category, GalleryDesign } from "@/lib/types/database";
import type { SiteSettings } from "@/lib/site-settings-read";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp";

const NAV: { id: GalleryView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "gallery", label: "Design Gallery", icon: Grid3x3 },
  { id: "categories", label: "Categories", icon: FolderOpen },
  { id: "featured", label: "Featured Designs", icon: Star },
  { id: "drafts", label: "Drafts", icon: ImagePlus },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export default function GalleryManagerApp({
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
  const [view, setView] = useState<GalleryView>("gallery");
  const [categories, setCategories] = useState(initialCategories);
  const [designs, setDesigns] = useState(initialDesigns);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<SortMode>("order");
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<GalleryDesign | null>(null);
  const [preview, setPreview] = useState<GalleryDesign | null>(null);
  const [moveTarget, setMoveTarget] = useState<GalleryDesign | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState(gallerySettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadCategory, setUploadCategory] = useState(categories[0]?.id || "");
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceDesignId = useRef<string | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const stats = useMemo(() => {
    let featured = 0;
    let drafts = 0;
    let trash = 0;
    let published = 0;
    for (const d of designs) {
      if (d.metadata?.galleryHidden) trash += 1;
      else if (!d.published) drafts += 1;
      else published += 1;
      if (d.metadata?.featured && !d.metadata?.galleryHidden) featured += 1;
    }
    return { total: designs.length, featured, drafts, trash, published };
  }, [designs]);

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
    }, 4000);
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
    let list = [...designs];

    if (view === "featured") list = list.filter((d) => d.metadata?.featured && !d.metadata?.galleryHidden);
    else if (view === "drafts") list = list.filter((d) => !d.published && !d.metadata?.galleryHidden);
    else if (view === "trash") list = list.filter((d) => d.metadata?.galleryHidden);
    else if (view === "gallery" || view === "upload") list = list.filter((d) => !d.metadata?.galleryHidden);

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
          (cat || "").toLowerCase().includes(q) ||
          (d.metadata?.clientName || "").toLowerCase().includes(q)
        );
      });
    }

    if (sort === "newest") list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === "oldest") list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "featured")
      list.sort((a, b) => {
        const af = a.metadata?.featured ? 1 : 0;
        const bf = b.metadata?.featured ? 1 : 0;
        return bf - af || a.sort_order - b.sort_order;
      });
    else list.sort((a, b) => a.sort_order - b.sort_order);

    return list;
  }, [designs, search, categoryFilter, sort, view, categoryMap]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const runUpload = async (files: File[]) => {
    const allowed = files.filter(isImageFile);
    if (!allowed.length) {
      flash("Please choose PNG, JPG, or WebP images.", true);
      return;
    }
    const catId = uploadCategory || null;
    setUploading(true);
    setUploadProgress(`Uploading ${allowed.length} image${allowed.length === 1 ? "" : "s"}…`);
    try {
      const result = await uploadDesignsToSection({
        files: allowed,
        categoryId: catId,
        startSortOrder: nextSortOrder(designs),
        onProgress: setUploadProgress,
      });
      if (result.created.length) {
        setDesigns((prev) => [...prev, ...result.created].sort((a, b) => a.sort_order - b.sort_order));
        flash(`${result.created.length} design${result.created.length === 1 ? "" : "s"} added.`);
        setView("gallery");
      }
      if (result.failed.length) {
        flash(`${result.failed.length} failed to upload.`, true);
      }
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
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
      return data;
    } finally {
      markPending([id], false);
    }
  };

  const bulkPatch = async (ids: string[], patch: Record<string, unknown>) => {
    if (!ids.length) return;
    markPending(ids, true);
    try {
      const res = await fetch("/api/gallery-designs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ids, patch }),
        cache: "no-store",
      });
      const data = await parseResponseJson<{ updated?: GalleryDesign[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Update failed");
      const map = new Map((data.updated || []).map((d) => [d.id, d]));
      setDesigns((prev) => prev.map((d) => map.get(d.id) || d));
      setSelected(new Set());
      flash(`${ids.length} updated.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed", true);
    } finally {
      markPending(ids, false);
    }
  };

  const deleteDesigns = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} design${ids.length === 1 ? "" : "s"} permanently?`)) return;
    markPending(ids, true);
    try {
      const res = await fetch("/api/gallery-designs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
        cache: "no-store",
      });
      const data = await parseResponseJson<{ deleted?: number; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setDesigns((prev) => prev.filter((d) => !ids.includes(d.id)));
      setSelected(new Set());
      flash(`${data.deleted ?? ids.length} deleted.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed", true);
    } finally {
      markPending(ids, false);
    }
  };

  const duplicateDesign = async (id: string) => {
    markPending([id], true);
    try {
      const res = await fetch(`/api/gallery-designs/${id}/duplicate`, { method: "POST", cache: "no-store" });
      const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Duplicate failed");
      setDesigns((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      flash("Design duplicated.");
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
      const res = await fetch("/api/gallery-designs/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await parseResponseJson<{ error?: string }>(res);
        throw new Error(data.error || "Reorder failed");
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : "Reorder failed", true);
    }
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
      await patchDesign(designId, {
        media_url: upData.url,
        metadata: {
          imageWidth: prepared.width,
          imageHeight: prepared.height,
          aspectRatio: prepared.aspectRatio,
        },
      });
      flash("Image replaced.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Replace failed", true);
    } finally {
      markPending([designId], false);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, project_type: "design" }),
        cache: "no-store",
      });
      const data = await parseResponseJson<Category & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed");
      setCategories((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setNewCategoryName("");
      flash(`Category "${name}" created.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed", true);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) throw new Error("Delete failed");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setDesigns((prev) => prev.map((d) => (d.category_id === id ? { ...d, category_id: null } : d)));
      flash("Category deleted.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Delete failed", true);
    }
  };

  const saveGallerySettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed");
      flash("Page settings saved.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed", true);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showToolbar = ["gallery", "featured", "drafts", "trash"].includes(view);

  return (
    <div className="gm-app">
      <aside className="gm-sidebar">
        <div className="gm-sidebar__brand">
          <p className="gm-sidebar__title">Gallery Studio</p>
          <p className="gm-sidebar__sub">Design portfolio manager</p>
        </div>
        <nav className="gm-sidebar__nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setView(id);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`gm-sidebar__link${view === id ? " gm-sidebar__link--active" : ""}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "featured" && stats.featured > 0 ? (
                <span className="gm-sidebar__badge">{stats.featured}</span>
              ) : null}
              {id === "drafts" && stats.drafts > 0 ? (
                <span className="gm-sidebar__badge">{stats.drafts}</span>
              ) : null}
              {id === "trash" && stats.trash > 0 ? (
                <span className="gm-sidebar__badge">{stats.trash}</span>
              ) : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setView("settings")}
            className={`gm-sidebar__link${view === "settings" ? " gm-sidebar__link--active" : ""}`}
          >
            <Settings size={17} />
            <span>Page Settings</span>
          </button>
        </nav>
      </aside>

      <div className="gm-main">
        <div className="gm-mobile-nav">
          {NAV.slice(0, 5).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setView(id);
                setVisibleCount(PAGE_SIZE);
              }}
              className={view === id ? "gm-mobile-nav__active" : ""}
            >
              {label.split(" ")[0]}
            </button>
          ))}
        </div>
        {showToolbar && (
          <div className="gm-toolbar">
            <div className="gm-toolbar__search">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search designs…"
                className="gm-toolbar__input"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="gm-toolbar__select"
            >
              <option value="all">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="gm-toolbar__select"
            >
              <option value="order">Display order</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="featured">Featured first</option>
            </select>
            <div className="gm-toolbar__size">
              <SlidersHorizontal size={14} />
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={gridSize === "small" ? 0 : gridSize === "medium" ? 1 : 2}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGridSize(v === 0 ? "small" : v === 1 ? "medium" : "large");
                }}
                aria-label="Grid size"
              />
              <span>{gridSize}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBulkMode((v) => !v);
                setSelected(new Set());
              }}
              className={`gm-toolbar__btn${bulkMode ? " gm-toolbar__btn--active" : ""}`}
            >
              <CheckSquare size={16} />
              Bulk
            </button>
            <button type="button" onClick={() => setView("upload")} className="gm-toolbar__btn gm-toolbar__btn--primary">
              <Upload size={16} />
              Upload
            </button>
          </div>
        )}

        {(message || error) && (
          <div className={`gm-toast${error ? " gm-toast--error" : ""}`}>{error || message}</div>
        )}

        {bulkMode && selected.size > 0 && showToolbar && (
          <div className="gm-bulkbar">
            <span>{selected.size} selected</span>
            {view === "trash" ? (
              <button
                type="button"
                onClick={() => bulkPatch([...selected], { metadata: { galleryHidden: false } })}
              >
                Restore
              </button>
            ) : (
              <>
                <button type="button" onClick={() => bulkPatch([...selected], { published: true })}>
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => bulkPatch([...selected], { metadata: { galleryHidden: true } })}
                >
                  Hide
                </button>
                <button
                  type="button"
                  onClick={() => bulkPatch([...selected], { metadata: { featured: true } })}
                >
                  Feature
                </button>
              </>
            )}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkPatch(
                    [...selected],
                    { category_id: e.target.value === "none" ? null : e.target.value }
                  );
                  e.target.value = "";
                }
              }}
            >
              <option value="">Move category…</option>
              <option value="none">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="gm-bulkbar__danger" onClick={() => deleteDesigns([...selected])}>
              Delete
            </button>
          </div>
        )}

        <div className="gm-content">
          {view === "dashboard" && (
            <div className="gm-dashboard">
              <h1 className="gm-page-title">Dashboard</h1>
              <div className="gm-stats">
                <div className="gm-stat">
                  <p className="gm-stat__value">{stats.total}</p>
                  <p className="gm-stat__label">Total designs</p>
                </div>
                <div className="gm-stat">
                  <p className="gm-stat__value">{stats.published}</p>
                  <p className="gm-stat__label">Published</p>
                </div>
                <div className="gm-stat">
                  <p className="gm-stat__value">{stats.featured}</p>
                  <p className="gm-stat__label">Featured</p>
                </div>
                <div className="gm-stat">
                  <p className="gm-stat__value">{stats.drafts}</p>
                  <p className="gm-stat__label">Drafts</p>
                </div>
                <div className="gm-stat">
                  <p className="gm-stat__value">{categories.length}</p>
                  <p className="gm-stat__label">Categories</p>
                </div>
              </div>
              <button type="button" className="gm-toolbar__btn gm-toolbar__btn--primary" onClick={() => setView("upload")}>
                <Upload size={16} />
                Upload new designs
              </button>
            </div>
          )}

          {(view === "gallery" || view === "featured" || view === "drafts" || view === "trash") && (
            <>
              <p className="gm-result-count">
                {filtered.length} design{filtered.length === 1 ? "" : "s"}
                {sort === "order" ? " · drag cards to reorder" : ""}
              </p>
              {visible.length > 0 ? (
                <GalleryMasonryGrid
                  items={visible}
                  gridSize={gridSize}
                  disabled={sort !== "order"}
                  onReorder={sort === "order" ? saveReorder : undefined}
                  onLoadMore={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  hasMore={hasMore}
                  renderCard={(design, { dragging }) => (
                    <GalleryDesignCard
                      design={design}
                      category={design.category_id ? categoryMap.get(design.category_id) : null}
                      bulkMode={bulkMode}
                      selected={selected.has(design.id)}
                      busy={pendingIds.has(design.id) || dragging}
                      onToggleSelect={() => toggleSelect(design.id)}
                      onEdit={() => setEditing(design)}
                      onReplace={() => {
                        replaceDesignId.current = design.id;
                        replaceRef.current?.click();
                      }}
                      onDuplicate={() => duplicateDesign(design.id)}
                      onDelete={() => deleteDesigns([design.id])}
                      onPreview={() => setPreview(design)}
                      onMoveCategory={() => setMoveTarget(design)}
                      onToggleFeatured={() =>
                        void patchDesign(design.id, {
                          metadata: { ...design.metadata, featured: !design.metadata?.featured },
                        }).then(() => flash("Updated."))
                      }
                    />
                  )}
                />
              ) : (
                <div className="gm-empty">
                  <p>No designs here yet.</p>
                  <button type="button" className="gm-toolbar__btn gm-toolbar__btn--primary" onClick={() => setView("upload")}>
                    Upload designs
                  </button>
                </div>
              )}
            </>
          )}

          {view === "upload" && (
            <div className="gm-upload-page">
              <h1 className="gm-page-title">Upload designs</h1>
              <p className="gm-page-desc">Drop images of any size — portrait, landscape, banners, brochures, and more.</p>
              <div className="gm-upload-meta">
                <label className="gm-field">
                  <span>Category</span>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="gm-field__input"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (!uploading) setDragging(true);
                }}
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
                className={`gm-upload-zone${dragging ? " gm-upload-zone--active" : ""}`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={32} className="animate-spin text-violet-500" />
                    <p>{uploadProgress}</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-violet-500" />
                    <p className="gm-upload-zone__title">Drag & drop your designs</p>
                    <p className="gm-upload-zone__hint">PNG, JPG, WebP · any dimensions</p>
                  </>
                )}
              </button>
              {visible.length > 0 && (
                <div className="gm-upload-preview">
                  <h2>Recent in gallery</h2>
                  <GalleryMasonryGrid
                    items={visible.slice(0, 12)}
                    gridSize="small"
                    renderCard={(design) => (
                      <GalleryDesignCard
                        design={design}
                        category={design.category_id ? categoryMap.get(design.category_id) : null}
                        bulkMode={false}
                        selected={false}
                        busy={false}
                        onToggleSelect={() => {}}
                        onEdit={() => setEditing(design)}
                        onReplace={() => {}}
                        onDuplicate={() => duplicateDesign(design.id)}
                        onDelete={() => deleteDesigns([design.id])}
                        onPreview={() => setPreview(design)}
                        onMoveCategory={() => setMoveTarget(design)}
                        onToggleFeatured={() => {}}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {view === "categories" && (
            <div className="gm-categories-page">
              <h1 className="gm-page-title">Categories</h1>
              <div className="gm-cat-add">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name…"
                  className="gm-field__input"
                  onKeyDown={(e) => e.key === "Enter" && createCategory()}
                />
                <button type="button" onClick={createCategory} className="gm-toolbar__btn gm-toolbar__btn--primary">
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <ul className="gm-cat-list">
                {categories.map((cat) => (
                  <li key={cat.id} className="gm-cat-row">
                    <div>
                      <p className="gm-cat-row__name">{cat.name}</p>
                      <p className="gm-cat-row__desc">{cat.description || "—"}</p>
                    </div>
                    <span>{designs.filter((d) => d.category_id === cat.id).length} designs</span>
                    <button type="button" onClick={() => deleteCategory(cat.id)} className="gm-cat-row__delete">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "settings" && (
            <div className="gm-settings-page">
              <h1 className="gm-page-title">Public page settings</h1>
              <label className="gm-field">
                <span>Eyebrow</span>
                <input
                  type="text"
                  value={settings.designGalleryEyebrow}
                  onChange={(e) => setSettings((s) => ({ ...s, designGalleryEyebrow: e.target.value }))}
                  className="gm-field__input"
                />
              </label>
              <label className="gm-field">
                <span>Page title</span>
                <input
                  type="text"
                  value={settings.designGalleryTitle}
                  onChange={(e) => setSettings((s) => ({ ...s, designGalleryTitle: e.target.value }))}
                  className="gm-field__input"
                />
              </label>
              <label className="gm-field">
                <span>Subtitle</span>
                <textarea
                  value={settings.designGallerySubtitle}
                  onChange={(e) => setSettings((s) => ({ ...s, designGallerySubtitle: e.target.value }))}
                  className="gm-field__textarea"
                  rows={3}
                />
              </label>
              <button
                type="button"
                disabled={savingSettings}
                onClick={saveGallerySettings}
                className="gm-toolbar__btn gm-toolbar__btn--primary"
              >
                {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save settings
              </button>
            </div>
          )}
        </div>
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

      {editing && (
        <div className="gm-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal__header">
              <h2>Edit design</h2>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={editing.media_url} alt="" className="gm-modal__preview" />
            <label className="gm-field">
              <span>Title</span>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="gm-field__input"
              />
            </label>
            <label className="gm-field">
              <span>Category</span>
              <select
                value={editing.category_id || ""}
                onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
                className="gm-field__input"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="gm-field gm-field--row">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              <span>Published</span>
            </label>
            <button
              type="button"
              className="gm-toolbar__btn gm-toolbar__btn--primary gm-modal__save"
              onClick={async () => {
                await patchDesign(editing.id, {
                  title: editing.title,
                  category_id: editing.category_id,
                  published: editing.published,
                  description: editing.description,
                  metadata: editing.metadata,
                });
                setEditing(null);
                flash("Saved.");
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {moveTarget && (
        <div className="gm-modal-backdrop" onClick={() => setMoveTarget(null)}>
          <div className="gm-modal gm-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal__header">
              <h2>Move to category</h2>
              <button type="button" onClick={() => setMoveTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <select
              className="gm-field__input"
              value={moveTarget.category_id || ""}
              onChange={async (e) => {
                const catId = e.target.value || null;
                await patchDesign(moveTarget.id, { category_id: catId });
                setMoveTarget(null);
                flash("Moved.");
              }}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {preview && (
        <div className="gm-modal-backdrop" onClick={() => setPreview(null)}>
          <div className="gm-preview" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="gm-preview__close" onClick={() => setPreview(null)}>
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.media_url} alt={preview.title} className="gm-preview__img" />
            <p className="gm-preview__title">{preview.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
