"use client";

import { useState, type ReactNode } from "react";
import DesignGalleryJustifiedGrid from "@/components/DesignGalleryJustifiedGrid";
import { galleryDesignToLayoutItem } from "@/lib/design-module-mappers";
import type { GalleryDesign } from "@/lib/types/database";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

type LayoutItem = GalleryDesign & ReturnType<typeof galleryDesignToLayoutItem>;

export default function GalleryJustifiedMosaic({
  designs,
  disabled,
  onReorder,
  onDragStart,
  onDragEnd,
  renderOverlay,
}: {
  designs: GalleryDesign[];
  disabled?: boolean;
  onReorder: (ordered: GalleryDesign[]) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  renderOverlay: (design: GalleryDesign, ctx: { busy: boolean }) => ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; side: "before" | "after" } | null>(
    null
  );

  const layoutItems: LayoutItem[] = designs.map((d) => ({
    ...d,
    ...galleryDesignToLayoutItem(d),
  }));

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId || disabled) return;
    const from = designs.findIndex((d) => d.id === dragId);
    const to = designs.findIndex((d) => d.id === targetId);
    if (from < 0 || to < 0) return;
    onReorder(reorderList(designs, from, to));
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <DesignGalleryJustifiedGrid
      items={layoutItems}
      className="dgm-mosaic"
      renderCard={(design, { height }) => {
        const isDragging = dragId === design.id;
        const hint =
          dropTarget?.id === design.id ? dropTarget.side : null;

        return (
          <article
            draggable={!disabled}
            onDragStart={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("button, select, a, input")) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.effectAllowed = "move";
              setDragId(design.id);
              onDragStart?.(design.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropTarget(null);
              onDragEnd?.();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragId || dragId === design.id) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const side = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
              setDropTarget({ id: design.id, side });
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDropTarget(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(design.id);
            }}
            className={`dgm-mosaic__cell${isDragging ? " dgm-mosaic__cell--dragging" : ""}${
              hint === "before" ? " dgm-mosaic__cell--drop-before" : ""
            }${hint === "after" ? " dgm-mosaic__cell--drop-after" : ""}`}
            style={{ width: "100%", height }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.media_url}
              alt={design.title}
              className="dgm-mosaic__img"
              draggable={false}
            />
            {renderOverlay(design, { busy: false })}
          </article>
        );
      }}
    />
  );
}
