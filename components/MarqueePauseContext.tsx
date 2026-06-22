"use client";

import { createContext, useContext } from "react";

type MarqueePauseContextValue = {
  setPaused: (paused: boolean) => void;
};

export const MarqueePauseContext = createContext<MarqueePauseContextValue>({
  setPaused: () => {},
});

export function useMarqueePause() {
  return useContext(MarqueePauseContext);
}
