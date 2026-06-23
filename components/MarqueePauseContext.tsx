"use client";

import { createContext, useContext } from "react";

type MarqueePauseContextValue = {
  setPaused: (paused: boolean) => void;
  rowDragging: boolean;
};

export const MarqueePauseContext = createContext<MarqueePauseContextValue>({
  setPaused: () => {},
  rowDragging: false,
});

export function useMarqueePause() {
  return useContext(MarqueePauseContext);
}
