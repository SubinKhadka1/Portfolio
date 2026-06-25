"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { uploadDesignsToSection } from "@/lib/gallery-design-create";
import { buildGalleryDesignReorderItems } from "@/lib/reorder-payload";
import { parseResponseJson } from "@/lib/parse-response";
import type { Category, GalleryDesign } from "@/lib/types/database";
import type { SiteSettings } from "@/lib/site-settings-read";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp";

type SortMode = "order" | "newest" | "oldest" | "featured";
type Tab = "designs" | "categories" | "settings";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function isImageFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext);
}

function nextSortOrder(designs: GalleryDesign[]) {
  return designs.reduce((max, d) => Math.max(max, d.sort_order), 0) + 1_000;
}

export default function DesignGalleryManager({
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
  const [tab, setTab] = useState<Tab>("designs");
  const [categories, setCategories] = useState(initialCategories);
  const [designs, setDesigns] = useState(initialDesigns);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<SortMode>("order");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<GalleryDesign | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [uploadCategory, setUploadCategory] = useState(categories[0]?.id || "");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [settings, setSettings] = useState(gallerySettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = designs.filter((d) => {
      if (categoryFilter === "uncategorized") {
        if (d.category_id) return false;
      } else if (categoryFilter !== "all" && d.category_id !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const cat = d.category_id ? categoryMap.get(d.category_id)?.name : "";
      return (
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (cat || "").toLowerCase().includes(q) ||
        (d.metadata?.clientName || "").toLowerCase().includes(q)
      );
    });

    if (sort === "newest") list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === "oldest") list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "featured")
      list = [...list].sort((a, b) => {
        const af = a.metadata?.featured ? 1 : 0;
        const bf = b.metadata?.featured ? 1 : 0;
        return bf - af || a.sort_order - b.sort_order;
      });
    else list = [...list].sort((a, b) => a.sort_order - b.sort_order);

    return list;
  }, [designs, search, categoryFilter, sort, categoryMap]);

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

  const runUpload = async (files: File[]) => {
    const allowed = files.filter(isImageFile);
    if (!allowed.length) {
      flash("Please choose PNG, JPG, or WebP images.", true);
      return;
    }

    const catId = uploadCategory || null;
    setUploading(true);
    setUploadProgress(`Starting upload of ${allowed.length} image${allowed.length === 1 ? "" : "s"}…`);

    try {
      const result = await uploadDesignsToSection({
        files: allowed,
        categoryId: catId,
        startSortOrder: nextSortOrder(designs),
        onProgress: setUploadProgress,
      });

      if (result.created.length) {
        setDesigns((prev) => [...prev, ...result.created].sort((a, b) => a.sort_order - b.sort_order));
        flash(`${result.created.length} design${result.created.length === 1 ? "" : "s"} uploaded.`);
      }
      if (result.failed.length) {
        flash(
          `${result.failed.length} failed: ${result.failed.map((f) => f.name).join(", ")}`,
          true
        );
      }
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveDesign = async (design: GalleryDesign) => {
    markPending([design.id], true);
    try {
      const res = await fetch(`/api/gallery-designs/${design.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: design.title,
          description: design.description,
          category_id: design.category_id,
          published: design.published,
          metadata: design.metadata,
        }),
        cache: "no-store",
      });
      const data = await parseResponseJson<GalleryDesign & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDesigns((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      setEditing(null);
      flash("Design saved.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed", true);
    } finally {
      markPending([design.id], false);
    }
  };

  const deleteDesigns = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} design${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

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
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
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
      const res = await fetch(`/api/gallery-designs/${id}/duplicate`, {
        method: "POST",
        cache: "no-store",
      });
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

  const bulkMoveCategory = async (categoryId: string | null) => {
    const ids = [...selected];
    if (!ids.length) return;
    markPending(ids, true);
    try {
      const res = await fetch("/api/gallery-designs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ids, patch: { category_id: categoryId } }),
        cache: "no-store",
      });
      const data = await parseResponseJson<{ updated?: GalleryDesign[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Move failed");
      const updatedMap = new Map((data.updated || []).map((d) => [d.id, d]));
      setDesigns((prev) => prev.map((d) => updatedMap.get(d.id) || d));
      setSelected(new Set());
      flash(`${ids.length} moved.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Move failed", true);
    } finally {
      markPending(ids, false);
    }
  };

  const saveReorder = async (ordered: GalleryDesign[]) => {
    const items = buildGalleryDesignReorderItems(ordered);
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
      const orderMap = new Map(items.map((i) => [i.id, i.sort_order]));
      setDesigns((prev) =>
        prev
          .map((d) => (orderMap.has(d.id) ? { ...d, sort_order: orderMap.get(d.id)! } : d))
          .sort((a, b) => a.sort_order - b.sort_order)
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Reorder failed", true);
    }
  };

  const onDropReorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = filtered.findIndex((d) => d.id === dragId);
    const to = filtered.findIndex((d) => d.id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = reorderList(filtered, from, to);
    void saveReorder(reordered);
    setDragId(null);
  };

  const toggleFeatured = async (design: GalleryDesign) => {
    const next = {
      ...design,
      metadata: { ...design.metadata, featured: !design.metadata?.featured },
    };
    setDesigns((prev) => prev.map((d) => (d.id === design.id ? next : d)));
    markPending([design.id], true);
    try {
      const res = await fetch(`/api/gallery-designs/${design.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: next.metadata }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      setDesigns((prev) => prev.map((d) => (d.id === design.id ? design : d)));
      flash("Could not update featured status", true);
    } finally {
      markPending([design.id], false);
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
      if (!res.ok) throw new Error(data.error || "Failed to create category");
      setCategories((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setNewCategoryName("");
      flash(`Category "${name}" created.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed", true);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Designs will become uncategorized.")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE", cache: "no-store" });
      if (!res.ok) {
        const data = await parseResponseJson<{ error?: string }>(res);
        throw new Error(data.error || "Delete failed");
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setDesigns((prev) =>
        prev.map((d) => (d.category_id === id ? { ...d, category_id: null } : d))
      );
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
      if (!res.ok) throw new Error("Failed to save settings");
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

  return (
    <div className="dgm">
      <div className="dgm__tabs">
        {(["designs", "categories", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`dgm__tab${tab === t ? " dgm__tab--active" : ""}`}
          >
            {t === "designs" ? "Designs" : t === "categories" ? "Categories" : "Page Settings"}
          </button>
        ))}
      </div>

      {(message || error) && (
        <div className={`dgm__alert${error ? " dgm__alert--error" : ""}`}>{error || message}</div>
      )}

      {tab === "designs" && (
        <>
          <div className="dgm__toolbar">
            <div className="dgm__search">
              <Search size={15} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search designs…"
                className="dgm__search-input"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="dgm__select"
            >
              <option value="all">All categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="dgm__select">
              <option value="order">Display order</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="featured">Featured</option>
            </select>
            <button type="button" onClick={() => setShowUpload((v) => !v)} className="dgm__btn dgm__btn--primary">
              <Upload size={15} />
              Upload
            </button>
          </div>

          {selected.size > 0 && (
            <div className="dgm__bulk">
              <span>{selected.size} selected</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    bulkMoveCategory(e.target.value === "none" ? null : e.target.value);
                    e.target.value = "";
                  }
                }}
                className="dgm__select"
              >
                <option value="">Move to category…</option>
                <option value="none">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteDesigns([...selected])}
                className="dgm__btn dgm__btn--danger"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="dgm__btn">
                Clear
              </button>
            </div>
          )}

          {showUpload && (
            <div className="dgm__upload">
              <div className="dgm__upload-header">
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="dgm__select"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                className={`dgm__dropzone${dragging ? " dgm__dropzone--active" : ""}`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={22} className="animate-spin text-purple-400" />
                    <span>{uploadProgress || "Uploading…"}</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} className="text-purple-400" />
                    <span>Drop images here or click to browse</span>
                    <span className="dgm__dropzone-hint">PNG, JPG, JPEG, WebP — any dimensions</span>
                  </>
                )}
              </button>
            </div>
          )}

          <p className="dgm__count">
            {filtered.length} design{filtered.length === 1 ? "" : "s"}
            {sort === "order" ? " — drag to reorder" : ""}
          </p>

          <div className="dgm__grid">
            {filtered.map((design) => {
              const busy = pendingIds.has(design.id);
              const cat = design.category_id ? categoryMap.get(design.category_id) : null;
              return (
                <article
                  key={design.id}
                  draggable={sort === "order" && !busy}
                  onDragStart={() => setDragId(design.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropReorder(design.id)}
                  className={`dgm__card${dragId === design.id ? " dgm__card--dragging" : ""}${selected.has(design.id) ? " dgm__card--selected" : ""}`}
                >
                  <div className="dgm__card-check">
                    <button
                      type="button"
                      onClick={() => toggleSelect(design.id)}
                      className={`dgm__checkbox${selected.has(design.id) ? " dgm__checkbox--on" : ""}`}
                      aria-label="Select design"
                    >
                      {selected.has(design.id) ? <Check size={12} /> : null}
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={design.media_url} alt={design.title} className="dgm__card-img" draggable={false} />
                  <div className="dgm__card-bar">
                    <span className="dgm__card-grip" aria-hidden>
                      <GripVertical size={12} />
                    </span>
                    <div className="dgm__card-info">
                      <p className="dgm__card-title">{design.title || "Untitled"}</p>
                      <p className="dgm__card-cat">{cat?.name || "Uncategorized"}</p>
                    </div>
                  </div>
                  <div className="dgm__card-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleFeatured(design)}
                      className={`dgm__icon-btn${design.metadata?.featured ? " dgm__icon-btn--featured" : ""}`}
                      title="Featured"
                    >
                      <Star size={13} fill={design.metadata?.featured ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditing(design)}
                      className="dgm__icon-btn"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => duplicateDesign(design.id)}
                      className="dgm__icon-btn"
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteDesigns([design.id])}
                      className="dgm__icon-btn dgm__icon-btn--danger"
                      title="Delete"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="dgm__empty">
              <p>No designs yet. Upload your first design above.</p>
            </div>
          )}
        </>
      )}

      {tab === "categories" && (
        <div className="dgm__categories">
          <div className="dgm__cat-add">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name…"
              className="dgm__input"
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
            />
            <button type="button" onClick={createCategory} className="dgm__btn dgm__btn--primary">
              <Plus size={15} />
              Add
            </button>
          </div>
          <ul className="dgm__cat-list">
            {categories.map((cat) => (
              <li key={cat.id} className="dgm__cat-item">
                <div>
                  <p className="dgm__cat-name">{cat.name}</p>
                  <p className="dgm__cat-desc">{cat.description || "—"}</p>
                </div>
                <span className="dgm__cat-count">
                  {designs.filter((d) => d.category_id === cat.id).length} designs
                </span>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id)}
                  className="dgm__icon-btn dgm__icon-btn--danger"
                  title="Delete category"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "settings" && (
        <div className="dgm__settings">
          <label className="dgm__field">
            <span>Eyebrow</span>
            <input
              type="text"
              value={settings.designGalleryEyebrow}
              onChange={(e) => setSettings((s) => ({ ...s, designGalleryEyebrow: e.target.value }))}
              className="dgm__input"
            />
          </label>
          <label className="dgm__field">
            <span>Page title</span>
            <input
              type="text"
              value={settings.designGalleryTitle}
              onChange={(e) => setSettings((s) => ({ ...s, designGalleryTitle: e.target.value }))}
              className="dgm__input"
            />
          </label>
          <label className="dgm__field">
            <span>Subtitle</span>
            <textarea
              value={settings.designGallerySubtitle}
              onChange={(e) => setSettings((s) => ({ ...s, designGallerySubtitle: e.target.value }))}
              className="dgm__textarea"
              rows={3}
            />
          </label>
          <button
            type="button"
            disabled={savingSettings}
            onClick={saveGallerySettings}
            className="dgm__btn dgm__btn--primary"
          >
            {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save page settings
          </button>
        </div>
      )}

      {editing && (
        <div className="dgm__drawer-backdrop" onClick={() => setEditing(null)}>
          <div className="dgm__drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dgm__drawer-header">
              <h2>Edit Design</h2>
              <button type="button" onClick={() => setEditing(null)} className="dgm__icon-btn">
                <X size={16} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={editing.media_url} alt="" className="dgm__drawer-preview" />
            <label className="dgm__field">
              <span>Title</span>
              <input
                type="text"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="dgm__input"
              />
            </label>
            <label className="dgm__field">
              <span>Description</span>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="dgm__textarea"
                rows={3}
              />
            </label>
            <label className="dgm__field">
              <span>Category</span>
              <select
                value={editing.category_id || ""}
                onChange={(e) =>
                  setEditing({ ...editing, category_id: e.target.value || null })
                }
                className="dgm__select dgm__select--full"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dgm__field">
              <span>Client name (optional)</span>
              <input
                type="text"
                value={editing.metadata?.clientName || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    metadata: { ...editing.metadata, clientName: e.target.value },
                  })
                }
                className="dgm__input"
              />
            </label>
            <label className="dgm__field">
              <span>Year (optional)</span>
              <input
                type="number"
                value={editing.metadata?.year || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    metadata: {
                      ...editing.metadata,
                      year: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                className="dgm__input"
              />
            </label>
            <label className="dgm__field dgm__field--row">
              <input
                type="checkbox"
                checked={editing.metadata?.featured || false}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    metadata: { ...editing.metadata, featured: e.target.checked },
                  })
                }
              />
              <span>Featured</span>
            </label>
            <label className="dgm__field dgm__field--row">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              <span>Published</span>
            </label>
            <button
              type="button"
              onClick={() => saveDesign(editing)}
              disabled={pendingIds.has(editing.id)}
              className="dgm__btn dgm__btn--primary dgm__btn--full"
            >
              {pendingIds.has(editing.id) ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
