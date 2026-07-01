"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { Category, DesignItem } from "@/lib/types/database";
import { groupDesignsByCategory } from "@/lib/design-gallery";
import DesignGalleryJustifiedGrid from "@/components/DesignGalleryJustifiedGrid";
import DesignGalleryLightbox from "@/components/DesignGalleryLightbox";

function GalleryCard({
  design,
  height,
  mode,
  onOpen,
}: {
  design: DesignItem;
  height: number;
  mode: "justified" | "stack";
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`gallery-card gallery-card--justified${mode === "stack" ? " gallery-card--stacked" : ""}`}
      style={mode === "justified" ? { height } : undefined}
      aria-label={`View ${design.title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={design.image}
        alt={design.title}
        loading="lazy"
        decoding="async"
        className="gallery-card__img"
        width={design.imageWidth}
        height={design.imageHeight}
        sizes={mode === "stack" ? "100vw" : "(max-width: 540px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        draggable={false}
      />
      {design.featured ? (
        <span className="gallery-card__featured" aria-label="Featured">
          <Star size={12} fill="currentColor" />
        </span>
      ) : null}
    </button>
  );
}

function JustifiedSection({
  title,
  designs,
  onOpen,
}: {
  title: string;
  designs: DesignItem[];
  onOpen: (id: string) => void;
}) {
  if (!designs.length) return null;

  return (
    <section className="gallery-section">
      <h2 className="gallery-section__title">{title.toUpperCase()}</h2>
      <DesignGalleryJustifiedGrid
        items={designs}
        className="gallery-justified"
        renderCard={(design, { height, mode }) => (
          <GalleryCard
            design={design}
            height={height}
            mode={mode}
            onOpen={() => onOpen(design.id)}
          />
        )}
      />
    </section>
  );
}

export default function DesignGallery({
  designs,
  categories,
}: {
  designs: DesignItem[];
  categories: Category[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sections = useMemo(() => {
    const ordered = [...designs].sort(
      (a, b) => (a.gallerySortOrder ?? 0) - (b.gallerySortOrder ?? 0)
    );
    return groupDesignsByCategory(ordered, categories);
  }, [designs, categories]);

  const lightboxDesigns = useMemo(() => {
    return [...designs].sort(
      (a, b) => (a.gallerySortOrder ?? 0) - (b.gallerySortOrder ?? 0)
    );
  }, [designs]);

  return (
    <div className="gallery-page">
      <div className="gallery-body">
        {sections.length === 0 ? (
          <div className="gallery-empty">
            <p>No designs published yet.</p>
          </div>
        ) : (
          sections.map((section) => (
            <JustifiedSection
              key={section.id}
              title={section.title}
              designs={section.designs}
              onOpen={setActiveId}
            />
          ))
        )}
      </div>

      {activeId ? (
        <DesignGalleryLightbox
          designs={lightboxDesigns}
          activeId={activeId}
          onClose={() => setActiveId(null)}
          onNavigate={setActiveId}
        />
      ) : null}
    </div>
  );
}
