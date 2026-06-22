"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { motion, useMotionValue, useAnimationFrame } from "framer-motion";
import { MarqueePauseContext } from "@/components/MarqueePauseContext";

type MarqueeTrackProps = {
  children: ReactNode;
  direction: "left" | "right";
  repeatCount: number;
  durationSec?: number;
  className?: string;
  animationClass?: "marquee" | "logo-marquee";
};

function wrapMarqueeX(value: number, loopWidth: number) {
  if (loopWidth <= 0) return value;
  let next = value;
  while (next < -loopWidth) next += loopWidth;
  while (next > 0) next -= loopWidth;
  return next;
}

export default function MarqueeTrack({
  children,
  direction,
  repeatCount,
  durationSec = 40,
  className = "showcase-track",
  animationClass = "marquee",
}: MarqueeTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [loopWidth, setLoopWidth] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const speedRef = useRef(0);

  const scrollEnabled = repeatCount >= 2;
  const rowClass =
    animationClass === "logo-marquee" ? "logo-marquee-row" : "marquee-row";
  const duration =
    direction === "right" ? Math.round(durationSec * 1.12) : durationSec;

  const pauseContext = useMemo(
    () => ({
      setPaused: (paused: boolean) => setHoldPaused(paused),
    }),
    []
  );

  const measureLoop = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const total = row.scrollWidth;
    const repeat = Math.max(2, repeatCount);
    const loop = total / repeat;
    if (loop > 0) {
      setLoopWidth(loop);
      speedRef.current = loop / duration;
      if (!initializedRef.current) {
        x.set(direction === "right" ? -loop : 0);
        initializedRef.current = true;
      }
    }
  }, [direction, duration, repeatCount, x]);

  useEffect(() => {
    measureLoop();
    const row = rowRef.current;
    if (!row) return;

    const observer = new ResizeObserver(measureLoop);
    observer.observe(row);
    window.addEventListener("resize", measureLoop);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureLoop);
    };
  }, [children, measureLoop]);

  useAnimationFrame((_, delta) => {
    if (!scrollEnabled || userPaused || holdPaused || isDragging || loopWidth <= 0) {
      return;
    }

    const step = speedRef.current * (delta / 1000);
    const next =
      direction === "left"
        ? wrapMarqueeX(x.get() - step, loopWidth)
        : wrapMarqueeX(x.get() + step, loopWidth);
    x.set(next);
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !scrollEnabled) return;

    const onWheel = (e: WheelEvent) => {
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      x.set(wrapMarqueeX(x.get() - delta * 0.9, loopWidth));
      setUserPaused(true);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => setUserPaused(false), 1400);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [loopWidth, scrollEnabled, x]);

  return (
    <MarqueePauseContext.Provider value={pauseContext}>
      <div ref={containerRef} className={className}>
        <motion.div
          ref={rowRef}
          className={`${rowClass} ${scrollEnabled ? "" : "marquee-static"} ${
            userPaused || holdPaused || isDragging ? "marquee-paused" : ""
          }`}
          drag={scrollEnabled && !holdPaused ? "x" : false}
          dragElastic={0.04}
          dragMomentum
          dragTransition={{ power: 0.2, timeConstant: 260 }}
          onDragStart={() => {
            setIsDragging(true);
            setUserPaused(true);
          }}
          onDragEnd={() => {
            x.set(wrapMarqueeX(x.get(), loopWidth));
            setIsDragging(false);
            if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
            wheelTimeoutRef.current = setTimeout(() => setUserPaused(false), 900);
          }}
          style={{
            x,
            cursor: scrollEnabled ? "grab" : "default",
          }}
          whileDrag={{ cursor: "grabbing" }}
        >
          {children}
        </motion.div>
      </div>
    </MarqueePauseContext.Provider>
  );
}
