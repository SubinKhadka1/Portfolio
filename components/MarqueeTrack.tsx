"use client";

import { motion, useMotionValue } from "framer-motion";
import type { ReactNode } from "react";

type MarqueeTrackProps = {
  children: ReactNode;
  direction: "left" | "right";
  repeatCount: number;
  durationSec?: number;
  className?: string;
  animationClass?: "marquee" | "logo-marquee";
};

export default function MarqueeTrack({
  children,
  direction,
  repeatCount,
  durationSec = 55,
  className = "showcase-track",
  animationClass = "marquee",
}: MarqueeTrackProps) {
  const x = useMotionValue(0);
  const scrollEnabled = repeatCount >= 2;
  const leftClass = animationClass === "logo-marquee" ? "logo-marquee-left" : "marquee-left";
  const rightClass = animationClass === "logo-marquee" ? "logo-marquee-right" : "marquee-right";
  const duration =
    direction === "right" ? Math.round(durationSec * 1.15) : durationSec;

  return (
    <div className={className}>
      <motion.div
        className={`marquee-row ${
          scrollEnabled ? (direction === "left" ? leftClass : rightClass) : "marquee-static"
        }`}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={() => x.set(0)}
        style={{
          x,
          cursor: "grab",
          ["--marquee-repeat" as string]: String(Math.max(2, repeatCount)),
          ["--marquee-duration" as string]: `${duration}s`,
        }}
        whileDrag={{ scale: 0.98, cursor: "grabbing" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
