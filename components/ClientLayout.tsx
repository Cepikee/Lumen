"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import CookieConsent from "./CookieConsent";
import SidebarWrapper from "./SidebarWrapper";
import { useUserStore } from "@/store/useUserStore";

interface ClientLayoutProps {
  children: React.ReactNode;
}

const preventMainFocus = (e: React.MouseEvent) => {
  if (!(e.target as Element).closest("input, textarea, [contenteditable='true']")) {
    // e.preventDefault();
  }
};

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isLanding = pathname.includes("landing");
  const isPremium = pathname.includes("premium");
  const isAdatvedelmi = pathname.includes("adatvedelem");
  const isASZF = pathname.includes("aszf");
  const isImpresszum = pathname.includes("impresszum");
  const isInsights = pathname.includes("insights");
  const isDns = pathname.includes("Dns");

  const shouldShowSidebar =
    pathname === "/" &&
    !isLanding &&
    !isPremium &&
    !isAdatvedelmi &&
    !isASZF &&
    !isImpresszum &&
    !isInsights &&
    !isDns;

  // THEME
  const theme = useUserStore((s) => s.theme);
  const loadUser = useUserStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // THEME HANDLING
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-user-theme", "true");

    if (theme === "dark") {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
      root.setAttribute("data-bs-theme", "dark");
      return;
    }

    if (theme === "light") {
      root.classList.add("theme-light");
      root.classList.remove("theme-dark");
      root.setAttribute("data-bs-theme", "light");
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const applySystemTheme = () => {
      if (prefersDark.matches) {
        root.classList.add("theme-dark");
        root.classList.remove("theme-light");
        root.setAttribute("data-bs-theme", "dark");
      } else {
        root.classList.add("theme-light");
        root.classList.remove("theme-dark");
        root.setAttribute("data-bs-theme", "light");
      }
    };

    applySystemTheme();
    prefersDark.addEventListener("change", applySystemTheme);

    return () => {
      prefersDark.removeEventListener("change", applySystemTheme);
    };
  }, [theme, pathname]);

  // ⭐⭐⭐ FILTER STATE — ZUSTAND + LOKÁLIS
  const viewMode = useUserStore((s) => s.viewMode);
  const setViewMode = useUserStore((s) => s.setViewMode);

  const isTodayMode = useUserStore((s) => s.isTodayMode);
  const setTodayMode = useUserStore((s) => s.setTodayMode);

  const searchTerm = useUserStore((s) => s.searchTerm);
  const setSearchTerm = useUserStore((s) => s.setSearchTerm);

  const sourceFilters = useUserStore((s) => s.sourceFilters);
  const setSourceFilters = useUserStore((s) => s.setSourceFilters);

  const categoryFilters = useUserStore((s) => s.categoryFilters);
  const setCategoryFilters = useUserStore((s) => s.setCategoryFilters);

  // ⭐ Ezek NEM a store részei → maradnak lokális state-ben
  const [availableSources, setAvailableSources] = useState<
    { id: number; name: string }[]
  >([]);

  const [availableCategories] = useState<string[]>([
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

  // LANDING OLDAL
  if (isLanding) {
    return (
      <main
        className="flex-grow-1 overflow-auto p-0"
        tabIndex={-1}
        onMouseDown={preventMainFocus}
      >
        {children}
      </main>
    );
  }

  // PREMIUM / STATIC OLDALAK
  if (isPremium || isAdatvedelmi || isASZF || isImpresszum || isInsights || isDns) {
    return (
      <>
        <Header />
        <main
          className="flex-grow-1 overflow-auto p-0"
          tabIndex={-1}
          onMouseDown={preventMainFocus}
        >
          {children}
        </main>
        <CookieConsent />
      </>
    );
  }

  // ⭐⭐⭐ FŐOLDAL — Sidebar + Header
  return (
    <>
      <Header />

      {shouldShowSidebar && (
        <SidebarWrapper
          onViewModeChange={setViewMode}
          onTodayFilter={() => setTodayMode(true)}
          onReset={() => {
            setTodayMode(false);
            setSourceFilters([]);
            setCategoryFilters([]);
          }}
          onSourceFilterChange={setSourceFilters}
          onCategoryFilterChange={setCategoryFilters}
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
        />
      )}

      <main
        className="flex-grow-1 overflow-auto p-3"
        tabIndex={-1}
        onMouseDown={preventMainFocus}
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {children}
      </main>

      <CookieConsent />
    </>
  );
}
