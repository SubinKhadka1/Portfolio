"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Search, Star } from "lucide-react";
import Link from "next/link";
import type { Category, DesignItem } from "@/lib/types/database";
import DesignGalleryMasonry from "@/components/DesignGalleryMasonry";
import DesignGalleryLightbox from "@/components/DesignGalleryLightbox";

type SortMode = "order" | "newest" | "oldest" | "featured";

function GalleryCard({
  design,
  index,
  onOpen,
}: {
  design: DesignItem;
  index: number;
  onOpen: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
      className="gallery-card group"
    >
      <button type="button" onClick={onOpen} className="gallery-card__media" aria-label={`View ${design.title}`}>
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
        <div className="gallery-card__overlay">
          <div className="gallery-card__overlay-inner">
            <h3 className="gallery-card__title">{design.title}</h3>
            {design.categoryName ? (
              <p className="gallery-card__category">{design.categoryName}</p>
            ) : null}
            <span className="gallery-card__cta">
              View Project
              <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
        {design.featured ? (
          <span className="gallery-card__featured" aria-label="Featured">
            <Star size={12} fill="currentColor" />
          </span>
        ) : null}
      </button>
    </motion.article>
  );
}

export default function DesignGallery({
  eyebrow,
  title,
  subtitle,
  designs,
  categories,
  totalDesigns,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  designs: DesignItem[];
  categories: Category[];
  totalDesigns: number;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("order");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = designs.filter((d) => {
      if (categoryFilter !== "all" && d.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.categoryName?.toLowerCase().includes(q) ||
        d.clientName?.toLowerCase().includes(q)
      );
    });

    if (sort === "newest") {
      list = [...list].sort(
        (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")
      );
    } else if (sort === "oldest") {
      list = [...list].sort(
        (a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")
      );
    } else if (sort === "featured") {
      list = [...list].sort((a, b) => {
        const af = a.featured ? 1 : 0;
        const bf = b.featured ? 1 : 0;
        if (bf !== af) return bf - af;
        return (a.gallerySortOrder ?? 0) - (b.gallerySortOrder ?? 0);
      });
    } else {
      list = [...list].sort(
        (a, b) => (a.gallerySortOrder ?? 0) - (b.gallerySortOrder ?? 0)
      );
    }

    return list;
  }, [designs, search, categoryFilter, sort]);

  const filterChips = useMemo(() => {
    const used = new Set(designs.map((d) => d.categoryId).filter(Boolean));
    return categories.filter((c) => used.has(c.id));
  }, [designs, categories]);

  return (
    <div className="gallery-page">
      <header className="gallery-hero">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="gallery-hero__inner"
        >
          <Link href="/" className="gallery-hero__back">
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <p className="gallery-hero__eyebrow">{eyebrow}</p>
          <h1 className="gallery-hero__title">{title}</h1>
          <p className="gallery-hero__subtitle">{subtitle}</p>
          <p className="gallery-hero__count">
            {totalDesigns} design{totalDesigns === 1 ? "" : "s"}
          </p>
        </motion.div>
      </header>

      <div className="gallery-controls">
        <div className="gallery-controls__search">
          <Search size={16} className="gallery-controls__search-icon" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designs…"
            className="gallery-controls__input"
            aria-label="Search designs"
          />
        </div>
        <div className="gallery-controls__filters">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`gallery-controls__chip${categoryFilter === "all" ? " gallery-controls__chip--active" : ""}`}
          >
            All
          </button>
          {filterChips.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`gallery-controls__chip${categoryFilter === cat.id ? " gallery-controls__chip--active" : ""}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="gallery-controls__sort"
          aria-label="Sort designs"
        >
          <option value="order">Display order</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="featured">Featured</option>
        </select>
      </div>

      <div className="gallery-body">
        {filtered.length === 0 ? (
          <div className="gallery-empty">
            <p>{search || categoryFilter !== "all" ? "No designs match your filters." : "No designs published yet."}</p>
          </div>
        ) : (
          <DesignGalleryMasonry
            items={filtered}
            renderCard={(design, { index }) => (
              <GalleryCard
                design={design}
                index={index}
                onOpen={() => setActiveId(design.id)}
              />
            )}
          />
        )}
      </div>

      {activeId ? (
        <DesignGalleryLightbox
          designs={filtered}
          activeId={activeId}
          onClose={() => setActiveId(null)}
          onNavigate={setActiveId}
        />
      ) : null}
    </div>
  );
}
