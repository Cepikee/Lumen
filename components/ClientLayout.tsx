"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import CookieConsent from "./CookieConsent";
import SidebarWrapper from "./SidebarWrapper";
import { LayoutContext } from "./LayoutContext";
import { useUserStore } from "@/store/useUserStore";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isLanding = pathname.includes("landing");
  const isPremium = pathname.includes("premium");

  // ⭐ Sidebar csak a főoldalon
  const shouldShowSidebar = pathname === "/" && !isLanding && !isPremium;

  // 🔥 GLOBAL THEME FROM ZUSTAND
  const theme = useUserStore((s) => s.theme);
  const loadUser = useUserStore((s) => s.loadUser);

  // 🔥 LOAD USER ONCE
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // 🔥 APPLY THEME TO HTML
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-user-theme", "true");

    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-bs-theme", "dark");
      return;
    }

    if (theme === "light") {
      root.classList.remove("dark");
      root.setAttribute("data-bs-theme", "light");
      return;
    }

    // SYSTEM MODE
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const applySystemTheme = () => {
      if (prefersDark.matches) {
        root.classList.add("dark");
        root.setAttribute("data-bs-theme", "dark");
      } else {
        root.classList.remove("dark");
        root.setAttribute("data-bs-theme", "light");
      }
    };

    applySystemTheme();
    prefersDark.addEventListener("change", applySystemTheme);

    return () => {
      prefersDark.removeEventListener("change", applySystemTheme);
    };
  }, [theme]);

  // --- FILTER STATE ---
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");
  const [isTodayMode, setIsTodayMode] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<
    { id: number; name: string }[]
  >([]);

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

  // ⭐⭐⭐ PREMIUM ÉS LANDING OLDAL — FULL WIDTH, HEADER NÉLKÜL ⭐⭐⭐
  if (isLanding || isPremium) {
    return (
      <main className="flex-grow-1 overflow-auto p-0">
        {children}
      </main>
    );
  }

  // ⭐⭐⭐ MINDEN MÁS OLDAL — RÉGI LAYOUT ⭐⭐⭐
  return (
    <>
      <LayoutContext.Provider
        value={{
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
        <Header />

        {shouldShowSidebar ? (
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
        ) : (
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
        )}
      </LayoutContext.Provider>

      <CookieConsent />
    </>
  );
}
