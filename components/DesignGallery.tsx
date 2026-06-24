"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X, ZoomIn } from "lucide-react";
import Link from "next/link";
import type { DesignItem } from "@/lib/types/database";
import type { DesignGallerySection } from "@/lib/design-gallery";
import DesignGalleryNaturalGrid from "@/components/DesignGalleryNaturalGrid";

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
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.35), ease: "easeOut" }}
      onClick={onOpen}
      className="design-gallery-card design-gallery-card--natural group text-left"
      aria-label={`Open ${design.title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={design.image}
        alt={design.title}
        loading="lazy"
        className="design-gallery-card__img"
        draggable={false}
      />
      <div className="design-gallery-card__shade" />
      <div className="design-gallery-card__meta">
        <p className="design-gallery-card__title">{design.title}</p>
        <span className="design-gallery-card__zoom" aria-hidden>
          <ZoomIn size={16} />
        </span>
      </div>
    </motion.button>
  );
}

function GallerySection({
  section,
  sectionIndex,
}: {
  section: DesignGallerySection;
  sectionIndex: number;
}) {
  const [activeDesign, setActiveDesign] = useState<DesignItem | null>(null);

  return (
    <section id={section.slug} className="design-gallery-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, delay: sectionIndex * 0.05 }}
        className="design-gallery-section__header"
      >
        <div className="design-gallery-section__line" />
        <div>
          <h2 className="design-gallery-section__title">{section.title}</h2>
          {section.description ? (
            <p className="design-gallery-section__desc">{section.description}</p>
          ) : null}
        </div>
      </motion.div>

      <DesignGalleryNaturalGrid
        items={section.designs}
        renderCard={(design, { index }) => (
          <GalleryCard
            key={design.id}
            design={design}
            index={index}
            onOpen={() => setActiveDesign(design)}
          />
        )}
      />

      <AnimatePresence>
        {activeDesign ? (
          <motion.div
            key="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="design-gallery-lightbox"
            onClick={() => setActiveDesign(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="design-gallery-lightbox__panel"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveDesign(null)}
                className="design-gallery-lightbox__close"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
              <div className="design-gallery-lightbox__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeDesign.image}
                  alt={activeDesign.title}
                  className="design-gallery-lightbox__img"
                  width={activeDesign.imageWidth}
                  height={activeDesign.imageHeight}
                />
              </div>
              <p className="design-gallery-lightbox__caption">{activeDesign.title}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default function DesignGallery({
  eyebrow,
  title,
  subtitle,
  sections,
  totalDesigns,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: DesignGallerySection[];
  totalDesigns: number;
}) {
  return (
    <div className="design-gallery-page">
      <div className="design-gallery-hero">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="design-gallery-hero__inner"
        >
          <Link href="/" className="design-gallery-back">
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <p className="design-gallery-eyebrow">{eyebrow}</p>
          <h1 className="design-gallery-title">{title}</h1>
          <p className="design-gallery-subtitle">{subtitle}</p>
          <p className="design-gallery-count">
            {totalDesigns} design{totalDesigns === 1 ? "" : "s"} across {sections.length} section
            {sections.length === 1 ? "" : "s"}
          </p>

          {sections.length > 1 ? (
            <div className="design-gallery-jump">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.slug}`} className="design-gallery-jump__chip">
                  {section.title}
                </a>
              ))}
            </div>
          ) : null}
        </motion.div>
      </div>

      <div className="design-gallery-body">
        {sections.length === 0 ? (
          <div className="design-gallery-empty">
            <p>No designs published yet. Add work from the admin dashboard.</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <GallerySection key={section.id} section={section} sectionIndex={index} />
          ))
        )}
      </div>
    </div>
  );
}
