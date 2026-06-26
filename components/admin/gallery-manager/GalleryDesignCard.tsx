"use client";

import {
  Copy,
  Eye,
  FolderInput,
  ImageIcon,
  Loader2,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { formatGalleryDate } from "@/components/admin/gallery-manager/types";
import type { Category, GalleryDesign } from "@/lib/types/database";

export default function GalleryDesignCard({
  design,
  category,
  bulkMode,
  selected,
  busy,
  onToggleSelect,
  onEdit,
  onReplace,
  onDuplicate,
  onDelete,
  onPreview,
  onMoveCategory,
  onToggleFeatured,
}: {
  design: GalleryDesign;
  category?: Category | null;
  bulkMode: boolean;
  selected: boolean;
  busy: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onMoveCategory: () => void;
  onToggleFeatured: () => void;
}) {
  return (
    <article className={`gm-card${selected ? " gm-card--selected" : ""}${busy ? " gm-card--busy" : ""}`}>
      {bulkMode && (
        <label className="gm-card__select">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} />
        </label>
      )}

      <div className="gm-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.media_url}
          alt={design.title}
          loading="lazy"
          className="gm-card__img"
          draggable={false}
        />
        {design.metadata?.featured ? (
          <span className="gm-card__featured" aria-label="Featured">
            <Star size={11} fill="currentColor" />
          </span>
        ) : null}
        {!design.published ? <span className="gm-card__draft">Draft</span> : null}
        <div className="gm-card__overlay">
          <div className="gm-card__actions">
            <button type="button" onClick={onEdit} title="Edit">
              <Pencil size={15} />
            </button>
            <button type="button" onClick={onReplace} title="Replace image">
              <ImageIcon size={15} />
            </button>
            <button type="button" onClick={onDuplicate} title="Duplicate">
              <Copy size={15} />
            </button>
            <button type="button" onClick={onDelete} title="Delete">
              <Trash2 size={15} />
            </button>
            <button type="button" onClick={onPreview} title="Preview">
              <Eye size={15} />
            </button>
            <button type="button" onClick={onMoveCategory} title="Move category">
              <FolderInput size={15} />
            </button>
            <button
              type="button"
              onClick={onToggleFeatured}
              title={design.metadata?.featured ? "Unfeature" : "Feature"}
              className={design.metadata?.featured ? "gm-card__action--star" : ""}
            >
              <Star size={15} fill={design.metadata?.featured ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        {busy ? (
          <div className="gm-card__loading">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : null}
      </div>

      <div className="gm-card__body">
        <h3 className="gm-card__title">{design.title || "Untitled"}</h3>
        <div className="gm-card__meta">
          {category ? <span className="gm-card__badge">{category.name}</span> : null}
          <time className="gm-card__date">{formatGalleryDate(design.created_at)}</time>
        </div>
      </div>
    </article>
  );
}
