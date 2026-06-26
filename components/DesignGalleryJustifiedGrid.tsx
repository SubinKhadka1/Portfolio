"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  GALLERY_ROW_GAP_PX,
  galleryWidthOverHeight,
  packGalleryRows,
  type GalleryAspectSource,
} from "@/lib/design-gallery-layout";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function DesignGalleryJustifiedGrid<T extends GalleryAspectSource & { id: string }>({
  items,
  className,
  packOptions,
  dragDisabled,
  onReorder,
  renderCard,
}: {
  items: T[];
  className?: string;
  packOptions?: { gap?: number; minHeight?: number; maxHeight?: number };
  dragDisabled?: boolean;
  onReorder?: (ordered: T[]) => void;
  renderCard: (item: T, layout: { height: number; index: number; dragging: boolean }) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) setContainerWidth(width);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const gap = packOptions?.gap ?? GALLERY_ROW_GAP_PX;

  const layout = useMemo(() => {
    const width = containerWidth > 0 ? containerWidth : 1152;
    return packGalleryRows(items, width, {
      gap,
      minHeight: packOptions?.minHeight,
      maxHeight: packOptions?.maxHeight,
    });
  }, [items, containerWidth, gap, packOptions?.minHeight, packOptions?.maxHeight]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className={className ?? "bh-rows"}>
      {layout.rows.map((row, rowIndex) => {
        const rowHeight = layout.heights[rowIndex];
        return (
          <div
            key={row.map((item) => item.id).join("-")}
            className="bh-row"
            style={{
              height: rowHeight,
              gap,
              marginBottom: gap,
            }}
          >
            {row.map((item, index) => {
              const cellWidth = rowHeight * galleryWidthOverHeight(item);
              const dragging = dragId === item.id;
              const canDrag = !dragDisabled && !!onReorder;

              return (
                <div
                  key={item.id}
                  className={`bh-row__cell${dragging ? " bh-row__cell--dragging" : ""}`}
                  style={{ width: cellWidth, height: rowHeight }}
                  draggable={canDrag}
                  onDragStart={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button, select, a, input, textarea, label")) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(item.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!dragId || !onReorder || dragId === item.id) return;
                    const from = items.findIndex((d) => d.id === dragId);
                    const to = items.findIndex((d) => d.id === item.id);
                    if (from < 0 || to < 0) return;
                    onReorder(reorderList(items, from, to));
                    setDragId(null);
                  }}
                >
                  {renderCard(item, { height: rowHeight, index, dragging })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
