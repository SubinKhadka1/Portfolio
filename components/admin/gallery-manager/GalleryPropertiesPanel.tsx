"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import type { Category, GalleryDesign } from "@/lib/types/database";

export default function GalleryPropertiesPanel({
  draft,
  categories,
  busy,
  sortIndex,
  onChange,
  onReplace,
  onDelete,
  onSave,
  onClose,
}: {
  draft: GalleryDesign;
  categories: Category[];
  busy: boolean;
  sortIndex: number;
  onChange: (next: GalleryDesign) => void;
  onReplace: () => void;
  onDelete: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="be-panel">
      <div className="be-panel__header">
        <h2>Properties</h2>
        <button type="button" onClick={onClose} className="be-panel__close" aria-label="Close panel">
          ×
        </button>
      </div>

      <div className="be-panel__body">
        <div className="be-panel__preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.media_url} alt={draft.title} />
        </div>

        <label className="be-field">
          <span>Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            className="be-field__input"
          />
        </label>

        <label className="be-field">
          <span>Category</span>
          <select
            value={draft.category_id || ""}
            onChange={(e) => onChange({ ...draft, category_id: e.target.value || null })}
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

        <label className="be-field">
          <span>Description</span>
          <textarea
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            className="be-field__textarea"
            rows={4}
          />
        </label>

        <label className="be-field be-field--toggle">
          <span>Featured</span>
          <input
            type="checkbox"
            checked={draft.metadata?.featured || false}
            onChange={(e) =>
              onChange({
                ...draft,
                metadata: { ...draft.metadata, featured: e.target.checked },
              })
            }
          />
        </label>

        <label className="be-field be-field--toggle">
          <span>Published</span>
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => onChange({ ...draft, published: e.target.checked })}
          />
        </label>

        <label className="be-field be-field--toggle">
          <span>Hidden from gallery</span>
          <input
            type="checkbox"
            checked={draft.metadata?.galleryHidden || false}
            onChange={(e) =>
              onChange({
                ...draft,
                metadata: { ...draft.metadata, galleryHidden: e.target.checked },
              })
            }
          />
        </label>

        <div className="be-field">
          <span>Display order</span>
          <p className="be-field__hint">Position {sortIndex + 1}</p>
        </div>

        <div className="be-panel__actions">
          <button type="button" onClick={onReplace} className="be-btn be-btn--ghost">
            <Upload size={15} />
            Replace image
          </button>
          <button type="button" onClick={onDelete} className="be-btn be-btn--danger">
            <Trash2 size={15} />
            Delete
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="be-btn be-btn--primary be-panel__save"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Save design
          </button>
        </div>
      </div>
    </aside>
  );
}
