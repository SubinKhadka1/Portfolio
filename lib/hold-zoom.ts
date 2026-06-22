"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMarqueePause } from "@/components/MarqueePauseContext";

const HOLD_MS = 450;
const MOVE_THRESHOLD = 10;
const ZOOM_SCALE = 1.52;

export function useHoldZoom() {
  const { setPaused } = useMarqueePause();
  const [zoomed, setZoomed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const holdActivatedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseZoom = useCallback(() => {
    clearTimer();
    if (zoomed) holdActivatedRef.current = true;
    setZoomed(false);
    setPaused(false);
  }, [clearTimer, setPaused, zoomed]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    setPaused(zoomed);
  }, [zoomed, setPaused]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      originRef.current = { x: e.clientX, y: e.clientY };
      holdActivatedRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        setZoomed(true);
        holdActivatedRef.current = true;
      }, HOLD_MS);
    },
    [clearTimer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!timerRef.current) return;
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) clearTimer();
    },
    [clearTimer]
  );

  const onPointerUp = useCallback(() => {
    releaseZoom();
  }, [releaseZoom]);

  const onPointerLeave = useCallback(() => {
    releaseZoom();
  }, [releaseZoom]);

  const onPointerCancel = useCallback(() => {
    releaseZoom();
  }, [releaseZoom]);

  const shouldSuppressClick = useCallback(() => {
    if (holdActivatedRef.current) {
      holdActivatedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    zoomed,
    holdProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
    motionProps: {
      animate: {
        scale: zoomed ? ZOOM_SCALE : 1,
        zIndex: zoomed ? 50 : 1,
      },
      transition: {
        type: "spring" as const,
        stiffness: zoomed ? 420 : 360,
        damping: zoomed ? 28 : 34,
        mass: 0.82,
      },
      style: { transformOrigin: "center center" },
    },
    shouldSuppressClick,
  };
}
