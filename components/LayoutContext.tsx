"use client";

import { createContext } from "react";

export interface LayoutContextValue {
  viewMode: "card" | "compact";
  isTodayMode: boolean;

  // --- Forrás szűrés ---
  sourceFilters: string[];
  availableSources: { id: number; name: string }[];

  // --- Kategória szűrés (ÚJ) ---
  categoryFilters: string[];
  availableCategories: string[];
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);
