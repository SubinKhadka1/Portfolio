"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import type { Category, DesignItem } from "@/lib/types/database";
import { groupDesignsByCategory } from "@/lib/design-gallery";
import DesignGalleryJustifiedGrid from "@/components/DesignGalleryJustifiedGrid";
import DesignGalleryLightbox from "@/components/DesignGalleryLightbox";

type SortMode = "order" | "newest" | "oldest" | "featured";

function sortDesigns(list: DesignItem[], sort: SortMode) {
  if (sort === "newest") {
    return [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }
  if (sort === "oldest") {
    return [...list].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }
  if (sort === "featured") {
    return [...list].sort((a, b) => {
      const af = a.featured ? 1 : 0;
      const bf = b.featured ? 1 : 0;
      if (bf !== af) return bf - af;
      return (a.gallerySortOrder ?? 0) - (b.gallerySortOrder ?? 0);
    });
  }
  return [...list].sort(
    (a, b) => (a.gallerySortOrder ?? 0) - (b.gallerySortOrder ?? 0)
  );
}

function GalleryCard({
  design,
  height,
  onOpen,
}: {
  design: DesignItem;
  height: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="gallery-card gallery-card--justified"
      style={{ height }}
      aria-label={`View ${design.title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={design.image}
        alt={design.title}
        loading="lazy"
        className="gallery-card__img"
        width={design.imageWidth}
        height={design.imageHeight}
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
  title?: string;
  designs: DesignItem[];
  onOpen: (id: string) => void;
}) {
  if (!designs.length) return null;

  return (
    <section className="gallery-section">
      {title ? <h2 className="gallery-section__title">{title.toUpperCase()}</h2> : null}
      <DesignGalleryJustifiedGrid
        items={designs}
        className="gallery-justified"
        renderCard={(design, { height }) => (
          <GalleryCard design={design} height={height} onOpen={() => onOpen(design.id)} />
        )}
      />
    </section>
  );
}

export default function DesignGallery({
  designs,
  categories,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  designs: DesignItem[];
  categories: Category[];
  totalDesigns: number;
}) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("order");
  const [activeId, setActiveId] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of designs) {
      if (d.categoryId) counts.set(d.categoryId, (counts.get(d.categoryId) || 0) + 1);
    }
    return counts;
  }, [designs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = designs;

    if (categoryFilter !== "all") {
      list = list.filter((d) => d.categoryId === categoryFilter);
    }

    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.categoryName?.toLowerCase().includes(q) ||
          d.clientName?.toLowerCase().includes(q)
      );
    }

    return sortDesigns(list, sort);
  }, [designs, search, categoryFilter, sort]);

  const sections = useMemo(() => {
    if (categoryFilter !== "all" || search.trim()) return null;
    return groupDesignsByCategory(sortDesigns(designs, sort), categories);
  }, [categoryFilter, search, designs, categories, sort]);

  const filterChips = useMemo(() => {
    return categories.filter((c) => (categoryCounts.get(c.id) || 0) > 0);
  }, [categories, categoryCounts]);

  const lightboxDesigns = filtered;

  return (
    <div className="gallery-page">
      <div className="gallery-toolbar">
        <div className="gallery-toolbar__inner">
          {searchOpen ? (
            <div className="gallery-toolbar__search">
              <Search size={15} className="gallery-toolbar__search-icon" />
              <input
                type="search"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search designs…"
                className="gallery-toolbar__input"
                aria-label="Search designs"
              />
              <button
                type="button"
                className="gallery-toolbar__close"
                onClick={() => {
                  setSearchOpen(false);
                  setSearch("");
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="gallery-toolbar__icon"
                onClick={() => setSearchOpen(true)}
                aria-label="Search designs"
              >
                <Search size={16} />
              </button>
              <div className="gallery-toolbar__filters">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`gallery-toolbar__link${categoryFilter === "all" ? " gallery-toolbar__link--active" : ""}`}
                >
                  All
                </button>
                {filterChips.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`gallery-toolbar__link${categoryFilter === cat.id ? " gallery-toolbar__link--active" : ""}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="gallery-toolbar__sort"
                aria-label="Sort designs"
              >
                <option value="order">Order</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="featured">Featured</option>
              </select>
            </>
          )}
        </div>
      </div>

      <div className="gallery-body">
        {filtered.length === 0 ? (
          <div className="gallery-empty">
            <p>
              {search || categoryFilter !== "all"
                ? "No designs match your filters."
                : "No designs published yet."}
            </p>
          </div>
        ) : categoryFilter === "all" && sections && !search.trim() ? (
          sections.map((section) => (
            <JustifiedSection
              key={section.id}
              title={section.title}
              designs={section.designs}
              onOpen={setActiveId}
            />
          ))
        ) : (
          <JustifiedSection
            title={
              categoryFilter !== "all"
                ? categories.find((c) => c.id === categoryFilter)?.name
                : undefined
            }
            designs={filtered}
            onOpen={setActiveId}
          />
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
