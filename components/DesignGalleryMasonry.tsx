"use client";

import type { ReactNode } from "react";

/** CSS column masonry — each item keeps its natural image height. */
export default function DesignGalleryMasonry<T extends { id: string }>({
  items,
  renderCard,
}: {
  items: T[];
  renderCard: (item: T, ctx: { index: number }) => ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div className="gallery-masonry" role="list">
      {items.map((item, index) => (
        <div key={item.id} className="gallery-masonry__item" role="listitem">
          {renderCard(item, { index })}
        </div>
      ))}
    </div>
  );
}
