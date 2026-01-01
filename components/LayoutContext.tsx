"use client";

import { createContext } from "react";

export interface LayoutContextValue {
  viewMode: "card" | "compact";
  isTodayMode: boolean;

  // --- Forrás szűrés ---
  sourceFilters: string[];
  availableSources: { id: number; name: string }[];

  // --- Kategória szűrés ---
  categoryFilters: string[];
  availableCategories: string[];

  // --- Keresés (új) ---
  searchTerm: string;
  setSearchTerm: (value: string) => void; // 🔥 ÚJ
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);
