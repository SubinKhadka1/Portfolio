"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import type { DesignItem } from "@/lib/types/database";

export default function DesignGalleryLightbox({
  designs,
  activeId,
  onClose,
  onNavigate,
}: {
  designs: DesignItem[];
  activeId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const activeIndex = designs.findIndex((d) => d.id === activeId);
  const active = activeIndex >= 0 ? designs[activeIndex] : null;
  const [zoom, setZoom] = useState(1);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) onNavigate(designs[activeIndex - 1].id);
  }, [activeIndex, designs, onNavigate]);

  const goNext = useCallback(() => {
    if (activeIndex < designs.length - 1) onNavigate(designs[activeIndex + 1].id);
  }, [activeIndex, designs, onNavigate]);

  useEffect(() => {
    setZoom(1);
  }, [activeId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="gallery-lightbox"
        onClick={onClose}
      >
        <div className="gallery-lightbox__toolbar" onClick={(e) => e.stopPropagation()}>
          <div className="gallery-lightbox__counter">
            {activeIndex + 1} / {designs.length}
          </div>
          <div className="gallery-lightbox__zoom-controls">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="gallery-lightbox__btn"
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>
            <span className="gallery-lightbox__zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="gallery-lightbox__btn"
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
          </div>
          <button type="button" onClick={onClose} className="gallery-lightbox__btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {activeIndex > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="gallery-lightbox__nav gallery-lightbox__nav--prev"
            aria-label="Previous design"
          >
            <ChevronLeft size={24} />
          </button>
        ) : null}

        {activeIndex < designs.length - 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="gallery-lightbox__nav gallery-lightbox__nav--next"
            aria-label="Next design"
          >
            <ChevronRight size={24} />
          </button>
        ) : null}

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="gallery-lightbox__stage"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="gallery-lightbox__image-wrap"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.image}
              alt={active.title}
              className="gallery-lightbox__image"
              width={active.imageWidth}
              height={active.imageHeight}
              draggable={false}
            />
          </div>
          <div className="gallery-lightbox__info">
            <h2 className="gallery-lightbox__title">{active.title}</h2>
            <div className="gallery-lightbox__meta">
              {active.categoryName ? (
                <span className="gallery-lightbox__category">{active.categoryName}</span>
              ) : null}
              {active.clientName ? <span>{active.clientName}</span> : null}
              {active.year ? <span>{active.year}</span> : null}
            </div>
            {active.description ? (
              <p className="gallery-lightbox__desc">{active.description}</p>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
