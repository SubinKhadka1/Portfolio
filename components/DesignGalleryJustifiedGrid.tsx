"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  GALLERY_ROW_GAP_PX,
  galleryWidthOverHeight,
  packGalleryRows,
  type GalleryAspectSource,
} from "@/lib/design-gallery-layout";

export default function DesignGalleryJustifiedGrid<T extends GalleryAspectSource & { id: string }>({
  items,
  className,
  renderCard,
}: {
  items: T[];
  className?: string;
  renderCard: (item: T, layout: { height: number; index: number }) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const layout = useMemo(() => {
    const width = containerWidth > 0 ? containerWidth : 1152;
    return packGalleryRows(items, width);
  }, [items, containerWidth]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className={className ?? "design-gallery-rows"}>
      {layout.rows.map((row, rowIndex) => {
        const rowHeight = layout.heights[rowIndex];
        return (
          <div
            key={row.map((item) => item.id).join("-")}
            className="design-gallery-row"
            style={{
              height: rowHeight,
              gap: GALLERY_ROW_GAP_PX,
              marginBottom: GALLERY_ROW_GAP_PX,
            }}
          >
            {row.map((item, index) => {
              const cellWidth = rowHeight * galleryWidthOverHeight(item);
              return (
                <div
                  key={item.id}
                  className="design-gallery-row__cell"
                  style={{ width: cellWidth, height: rowHeight }}
                >
                  {renderCard(item, { height: rowHeight, index })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
