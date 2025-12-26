"use client";

import { createContext } from "react";

export interface LayoutContextValue {
  viewMode: "card" | "compact";
  isTodayMode: boolean;
  sourceFilters: string[];
  availableSources: { id: number; name: string }[];
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);
