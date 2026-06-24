"use client";

import {
  useRef,
  useEffect,
  useState,
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
  interactive?: boolean;
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
  interactive = true,
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
      rowDragging: isDragging,
    }),
    [isDragging]
  );

  const measureLoop = () => {
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
      } else {
        x.set(wrapMarqueeX(x.get(), loop));
      }
    }
  };

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
  }, [children, direction, duration, repeatCount, x]);

  useAnimationFrame((_, delta) => {
    if (loopWidth <= 0) return;

    const current = x.get();
    const wrapped = wrapMarqueeX(current, loopWidth);
    if (wrapped !== current) x.set(wrapped);

    if (!scrollEnabled || userPaused || holdPaused || isDragging) return;

    const step = speedRef.current * (delta / 1000);
    const next =
      direction === "left"
        ? wrapMarqueeX(x.get() - step, loopWidth)
        : wrapMarqueeX(x.get() + step, loopWidth);
    x.set(next);
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !scrollEnabled || !interactive) return;

    const onWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX <= absY || absX < 4) return;

      e.preventDefault();
      x.set(wrapMarqueeX(x.get() - e.deltaX * 0.9, loopWidth));
      setUserPaused(true);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => setUserPaused(false), 1400);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [loopWidth, scrollEnabled, x, interactive]);

  return (
    <MarqueePauseContext.Provider value={pauseContext}>
      <div ref={containerRef} className={className}>
        <motion.div
          ref={rowRef}
          className={`${rowClass} ${scrollEnabled ? "" : "marquee-static"} ${
            interactive && (userPaused || holdPaused || isDragging) ? "marquee-paused" : ""
          }`}
          drag={interactive && scrollEnabled && !holdPaused ? "x" : false}
          dragElastic={0}
          dragMomentum={false}
          onDrag={() => {
            if (!interactive || loopWidth <= 0) return;
            x.set(wrapMarqueeX(x.get(), loopWidth));
          }}
          onDragStart={() => {
            if (!interactive) return;
            setIsDragging(true);
            setUserPaused(true);
          }}
          onDragEnd={() => {
            if (!interactive) return;
            if (loopWidth > 0) x.set(wrapMarqueeX(x.get(), loopWidth));
            setIsDragging(false);
            if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
            wheelTimeoutRef.current = setTimeout(() => setUserPaused(false), 900);
          }}
          style={{
            x,
            cursor: interactive && scrollEnabled ? "grab" : "default",
            touchAction: interactive ? "pan-y" : "auto",
          }}
          whileDrag={interactive ? { cursor: "grabbing" } : undefined}
        >
          {children}
        </motion.div>
      </div>
    </MarqueePauseContext.Provider>
  );
}
