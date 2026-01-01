"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import CookieConsent from "./CookieConsent";
import SidebarWrapper from "./SidebarWrapper";
import { LayoutContext } from "./LayoutContext";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");
  const [isTodayMode, setIsTodayMode] = useState(false);

  // 🔥 Kereső
  const [searchTerm, setSearchTerm] = useState("");

  // --- Forrás szűrés ---
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<
    { id: number; name: string }[]
  >([]);

  // --- Kategória szűrés ---
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "Egészségügy",
    "Gazdaság",
    "Közélet",
    "Kultúra",
    "Oktatás",
    "Politika",
    "Sport",
    "Tech",
  ]);

  // Források betöltése
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/sources", { cache: "no-store" });
        const data = await res.json();
        if (mounted && Array.isArray(data)) setAvailableSources(data);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewModeChange = useCallback((mode: string) => {
    if (mode === "card" || mode === "compact") setViewMode(mode);
  }, []);

  const handleSourceFilterChange = useCallback((sources: string[]) => {
    setSourceFilters(sources);
  }, []);

  const handleCategoryFilterChange = useCallback((cats: string[]) => {
    setCategoryFilters(cats);
  }, []);

  return (
    <>
      {/* 🔥 A Header-t ÁTHELYEZTÜK a Provider ALÁ */}
      <LayoutContext.Provider
        value={{
          viewMode,
          isTodayMode,

          // Források
          sourceFilters,
          availableSources,

          // Kategóriák
          categoryFilters,
          availableCategories,

          // Keresés
          searchTerm,
          setSearchTerm,
        }}
      >
        {/* 🔥 MOST MÁR MEGKAPJA A CONTEXT-ET */}
        <Header />

        <SidebarWrapper
          onViewModeChange={handleViewModeChange}
          onTodayFilter={() => setIsTodayMode(true)}
          onReset={() => {
            setIsTodayMode(false);
            setSourceFilters([]);
            setCategoryFilters([]);
          }}
          onSourceFilterChange={handleSourceFilterChange}
          onCategoryFilterChange={handleCategoryFilterChange}
          activeFilterState={{
            viewMode,
            isTodayMode,
            sourceFilters,
            availableSources,
            categoryFilters,
            availableCategories,
            searchTerm,
            setSearchTerm,
          }}
        >
          <main
            className="flex-grow-1 overflow-auto p-3"
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {children}
          </main>
        </SidebarWrapper>
      </LayoutContext.Provider>

      <CookieConsent />
    </>
  );
}
