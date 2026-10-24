"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import CookieConsent from "./CookieConsent";
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
  const isTrends = pathname === "/trends";
  const isDns = pathname.includes("Dns");

  // THEME
  const theme = useUserStore((s) => s.theme);
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

  // The trends workspace owns its complete dashboard shell (brand rail,
  // filters and top toolbar), so rendering the global header as well would
  // duplicate navigation and break the reference layout.
  if (isTrends) {
    return (
      <>
        <main
          className="flex-grow-1 p-0"
          tabIndex={-1}
          onMouseDown={preventMainFocus}
        >
          {children}
        </main>
        <CookieConsent />
      </>
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

      <main
        className="flex-grow-1 p-0"
        tabIndex={-1}
        onMouseDown={preventMainFocus}
        style={{ width: "100%" }}
      >
        {children}
      </main>

      <CookieConsent />
    </>
  );
}
