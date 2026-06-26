"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GridSize } from "@/components/admin/gallery-manager/types";
import { GRID_COLUMN_WIDTH } from "@/components/admin/gallery-manager/types";

function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function GalleryMasonryGrid<T extends { id: string }>({
  items,
  gridSize,
  disabled,
  onReorder,
  onLoadMore,
  hasMore,
  renderCard,
}: {
  items: T[];
  gridSize: GridSize;
  disabled?: boolean;
  onReorder?: (ordered: T[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  renderCard: (item: T, ctx: { index: number; dragging: boolean }) => ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, items.length]);

  const colWidth = GRID_COLUMN_WIDTH[gridSize];

  return (
    <>
      <div
        className="gm-masonry"
        style={{ columnWidth: `${colWidth}px` }}
      >
        {items.map((item, index) => {
          const dragging = dragId === item.id;
          return (
            <div
              key={item.id}
              className={`gm-masonry__item${dragging ? " gm-masonry__item--dragging" : ""}`}
              draggable={!disabled && !!onReorder}
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
              {renderCard(item, { index, dragging })}
            </div>
          );
        })}
      </div>
      {hasMore ? <div ref={sentinelRef} className="gm-masonry__sentinel" aria-hidden /> : null}
    </>
  );
}
