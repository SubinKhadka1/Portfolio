"use client";

import { Copy, GripVertical, ImageIcon, Pencil, Star, Trash2 } from "lucide-react";
import type { GalleryDesign } from "@/lib/types/database";

export default function GalleryDesignCard({
  design,
  active,
  busy,
  onSelect,
  onEdit,
  onReplace,
  onDuplicate,
  onDelete,
  onToggleFeatured,
  onDragHandle,
}: {
  design: GalleryDesign;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onDragHandle?: () => void;
}) {
  return (
    <article
      className={`be-card${active ? " be-card--active" : ""}${busy ? " be-card--busy" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="be-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.media_url}
          alt={design.title}
          loading="lazy"
          className="be-card__img"
          draggable={false}
        />
        {design.metadata?.featured ? (
          <span className="be-card__star" aria-hidden>
            <Star size={10} fill="currentColor" />
          </span>
        ) : null}
        <div className="be-card__overlay">
          <div className="be-card__toolbar">
            <button
              type="button"
              title="Drag"
              className="be-card__tool be-card__tool--grip"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.stopPropagation();
                onDragHandle?.();
              }}
            >
              <GripVertical size={14} />
            </button>
            <button type="button" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil size={14} />
            </button>
            <button type="button" title="Replace" onClick={(e) => { e.stopPropagation(); onReplace(); }}>
              <ImageIcon size={14} />
            </button>
            <button type="button" title="Feature" onClick={(e) => { e.stopPropagation(); onToggleFeatured(); }}>
              <Star size={14} fill={design.metadata?.featured ? "currentColor" : "none"} />
            </button>
            <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
              <Copy size={14} />
            </button>
            <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
