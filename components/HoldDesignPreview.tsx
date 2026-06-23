"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type HoldDesignPreviewProps = {
  open: boolean;
  image: string;
  alt: string;
  isPortrait: boolean;
};

export default function HoldDesignPreview({
  open,
  image,
  alt,
  isPortrait,
}: HoldDesignPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="design-hold-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="design-pop-preview"
          aria-hidden
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="design-pop-preview__backdrop"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.9 }}
            className={`design-pop-preview__card ${
              isPortrait
                ? "design-pop-preview__card--portrait"
                : "design-pop-preview__card--square"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={alt}
              className={`design-pop-preview__img ${
                isPortrait
                  ? "design-pop-preview__img--portrait"
                  : "design-pop-preview__img--square"
              }`}
              draggable={false}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
