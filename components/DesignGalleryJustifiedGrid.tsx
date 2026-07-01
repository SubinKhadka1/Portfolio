"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  computeJustifiedRow,
  galleryWidthOverHeight,
  getGalleryPackOptionsForWidth,
  packGalleryRows,
  shouldStackGallery,
  type GalleryAspectSource,
} from "@/lib/design-gallery-layout";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export type GalleryCardLayout = {
  height: number;
  index: number;
  dragging: boolean;
  mode: "justified" | "stack";
};

export default function DesignGalleryJustifiedGrid<T extends GalleryAspectSource & { id: string }>({
  items,
  className,
  packOptions,
  stackMode = "auto",
  dragDisabled,
  onReorder,
  renderCard,
}: {
  items: T[];
  className?: string;
  packOptions?: { gap?: number; minHeight?: number; maxHeight?: number };
  stackMode?: boolean | "auto";
  dragDisabled?: boolean;
  onReorder?: (ordered: T[]) => void;
  renderCard: (item: T, layout: GalleryCardLayout) => ReactNode;
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

  const responsivePack = useMemo(
    () => getGalleryPackOptionsForWidth(containerWidth > 0 ? containerWidth : 1152),
    [containerWidth]
  );

  const gap = packOptions?.gap ?? responsivePack.gap;
  const minHeight = packOptions?.minHeight ?? responsivePack.minHeight;
  const maxHeight = packOptions?.maxHeight ?? responsivePack.maxHeight;
  const useStack = shouldStackGallery(containerWidth, stackMode);

  const layout = useMemo(() => {
    const width = containerWidth > 0 ? containerWidth : 1152;
    return packGalleryRows(items, width, { gap, minHeight, maxHeight });
  }, [items, containerWidth, gap, minHeight, maxHeight]);

  if (items.length === 0) return null;

  if (useStack) {
    return (
      <div ref={containerRef} className={`${className ?? "bh-rows"} gallery-stack`}>
        {items.map((item, index) => {
          const ratio = galleryWidthOverHeight(item);
          return (
            <div
              key={item.id}
              className="gallery-stack__cell"
              style={{ aspectRatio: String(ratio) }}
            >
              {renderCard(item, { height: 0, index, dragging: false, mode: "stack" })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className ?? "bh-rows"}>
      {layout.rows.map((row, rowIndex) => {
        const width = containerWidth > 0 ? containerWidth : 1152;
        const { height: rowHeight, cellWidths } = computeJustifiedRow(row, width, gap, maxHeight);

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
              const cellWidth = cellWidths[index];
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
                  {renderCard(item, { height: rowHeight, index, dragging, mode: "justified" })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
