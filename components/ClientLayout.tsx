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
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<
    { id: number; name: string }[]
  >([]);

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

  return (
    <>
      <Header />

      <LayoutContext.Provider
        value={{
          viewMode,
          isTodayMode,
          sourceFilters,
          availableSources,
        }}
      >
        <SidebarWrapper
          onViewModeChange={handleViewModeChange}
          onTodayFilter={() => setIsTodayMode(true)}
          onReset={() => {
            setIsTodayMode(false);
            setSourceFilters([]);
          }}
          onSourceFilterChange={handleSourceFilterChange}
          activeFilterState={{
            viewMode,
            isTodayMode,
            sourceFilters,
            availableSources,
          }}
        >
          <main className="flex-grow-1 overflow-auto p-3" 
          style={{ 
            maxWidth: "1280px", 
            margin: "0 auto", 
            width: "100%", }} > 
            {children} 
            </main>
        </SidebarWrapper>
      </LayoutContext.Provider>

      <CookieConsent />
    </>
  );
}
