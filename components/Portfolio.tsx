"use client";
import { motion } from "framer-motion";
import type { DesignItem } from "@/lib/types/database";
import { loopForMarquee, groupDesignsByMarqueeRow } from "@/lib/marquee";
import { PORTRAIT_DESIGN_IMAGES } from "@/lib/static-data";
import MarqueeTrack from "@/components/MarqueeTrack";
import HoldDesignPreview from "@/components/HoldDesignPreview";
import { useHoldZoom } from "@/lib/hold-zoom";

function DesignCard({ design }: { design: DesignItem }) {
  const isPortrait =
    design.aspectRatio === "portrait" || PORTRAIT_DESIGN_IMAGES.has(design.image);
  const { zoomed, useOverlay, holdProps, motionProps } = useHoldZoom();

  return (
    <>
      <motion.article
        {...holdProps}
        {...motionProps}
        className={`design-slide group relative ${
          isPortrait ? "design-slide--portrait" : "design-slide--square"
        } ${zoomed && !useOverlay ? "design-slide--zoomed" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.image}
          alt={design.title}
          className={`design-slide-img ${
            isPortrait ? "design-slide-img--portrait" : "design-slide-img--square"
          }`}
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </motion.article>

      {useOverlay && (
        <HoldDesignPreview
          open={zoomed}
          image={design.image}
          alt={design.title}
          isPortrait={isPortrait}
        />
      )}
    </>
  );
}

type PortfolioProps = {
  designs?: DesignItem[];
  rows?: number;
  repeat?: number;
  scrollDuration?: number;
};

export default function Portfolio({
  designs = [],
  rows = 3,
  repeat = 2,
  scrollDuration = 35,
}: PortfolioProps) {
  const rowData = groupDesignsByMarqueeRow(designs, rows);
  const directions: Array<"left" | "right"> = ["left", "right", "left"];

  if (designs.length === 0) {
    return (
      <section id="portfolio" className="py-14 md:py-20 bg-black">
        <div className="section-container text-center">
          <p className="section-eyebrow">My Designs</p>
          <h2 className="section-heading">
            Creative <span className="text-purple-400">Showcase</span>
          </h2>
          <p className="text-gray-500 text-sm mt-4">Add designs from the admin dashboard to show them here.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="portfolio" className="py-14 md:py-20 bg-black overflow-x-hidden">
      <div className="section-container mb-8 md:mb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <p className="section-eyebrow">My Designs</p>
          <h2 className="section-heading">
            Creative <span className="text-purple-400">Showcase</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto leading-relaxed px-2">
            {designs.length} design{designs.length === 1 ? "" : "s"} · {rows} row{rows === 1 ? "" : "s"} · drag or scroll a row · hold to zoom
          </p>
        </motion.div>
      </div>

      <div className="relative flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 py-2">
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 md:w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 md:w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        {rowData.map((row, i) => {
          const looped = loopForMarquee(row, repeat);
          return (
            <MarqueeTrack
              key={i}
              direction={directions[i % directions.length]}
              repeatCount={repeat}
              durationSec={scrollDuration}
            >
              {looped.map((design, j) => (
                <DesignCard key={`${design.id}-${j}`} design={design} />
              ))}
            </MarqueeTrack>
          );
        })}
      </div>
    </section>
  );
}
