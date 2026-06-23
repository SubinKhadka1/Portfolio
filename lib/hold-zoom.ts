"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMarqueePause } from "@/components/MarqueePauseContext";

const HOLD_MS = 380;
const HOLD_MS_TOUCH = 320;
const MOVE_THRESHOLD = 8;
const ZOOM_SCALE = 1.45;

function prefersTouchPreview() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
}

export function useHoldZoom() {
  const { setPaused, rowDragging } = useMarqueePause();
  const [zoomed, setZoomed] = useState(false);
  const [useOverlay] = useState(prefersTouchPreview);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const holdActivatedRef = useRef(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

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
    if (targetRef.current && pointerIdRef.current !== null) {
      try {
        targetRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }
    pointerIdRef.current = null;
  }, [clearTimer, setPaused, zoomed]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    setPaused(zoomed);
  }, [zoomed, setPaused]);

  useEffect(() => {
    if (rowDragging) {
      clearTimer();
      setZoomed(false);
      setPaused(false);
    }
  }, [rowDragging, clearTimer, setPaused]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      targetRef.current = e.currentTarget;
      originRef.current = { x: e.clientX, y: e.clientY };
      holdActivatedRef.current = false;
      clearTimer();
      const delay = useOverlay ? HOLD_MS_TOUCH : HOLD_MS;
      timerRef.current = setTimeout(() => {
        setZoomed(true);
        holdActivatedRef.current = true;
        pointerIdRef.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }, delay);
    },
    [clearTimer, useOverlay]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!timerRef.current && !zoomed) return;
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
        if (!zoomed) clearTimer();
      }
    },
    [clearTimer, zoomed]
  );

  const onPointerUp = useCallback(() => {
    releaseZoom();
  }, [releaseZoom]);

  const onPointerLeave = useCallback(() => {
    if (!zoomed) releaseZoom();
  }, [releaseZoom, zoomed]);

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

  const showInlineZoom = zoomed && !useOverlay;

  return {
    zoomed,
    useOverlay,
    holdProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
    motionProps: showInlineZoom
      ? {
          animate: {
            scale: ZOOM_SCALE,
            zIndex: 50,
          },
          transition: {
            type: "spring" as const,
            stiffness: 420,
            damping: 28,
            mass: 0.82,
          },
          style: { transformOrigin: "center center" },
        }
      : {
          animate: { scale: 1, zIndex: 1 },
          transition: {
            type: "spring" as const,
            stiffness: 360,
            damping: 34,
            mass: 0.82,
          },
          style: { transformOrigin: "center center" },
        },
    shouldSuppressClick,
  };
}
