"use client";

import type { ReactNode } from "react";

/** Each design sizes to its own image — no shared row height or white card padding. */
export default function DesignGalleryNaturalGrid<T extends { id: string }>({
  items,
  renderCard,
}: {
  items: T[];
  renderCard: (item: T, ctx: { index: number }) => ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div className="design-gallery-natural">
      {items.map((item, index) => (
        <div key={item.id} className="design-gallery-natural__cell">
          {renderCard(item, { index })}
        </div>
      ))}
    </div>
  );
}
