// components/ThemeSync.tsx
"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";

/**
 * ThemeSync
 * - Szinkronizálja a Zustand store-ban lévő `theme` értéket
 *   a <html data-theme="..."> attribútummal.
 * - Nem módosítja a ThemeSwitch komponens logikáját.
 *
 * Használat: helyezd be a root layoutba vagy az insights page headerébe:
 * <ThemeSync />
 */

export default function ThemeSync() {
  const theme = useUserStore((s) => s.theme); // "dark" | "system" | "light" | undefined

  useEffect(() => {
    try {
      // Ha nincs érték vagy "system" -> eltávolítjuk az attribútumot,
      // így a CSS @media (prefers-color-scheme) dönt.
      if (!theme || theme === "system") {
        document.documentElement.removeAttribute("data-theme");
        return;
      }

      // Ha explicit "light", állítsuk be a data-theme="light"
      if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        return;
      }

      // Ha explicit "dark", eltávolítjuk az attribútumot (dark az alap),
      // vagy ha inkább explicit "dark"-ot szeretnél, használhatod:
      // document.documentElement.setAttribute("data-theme", "dark");
      // De a korábbi CSS a data-theme="light"-ot kezeli, így a legegyszerűbb:
      if (theme === "dark") {
        document.documentElement.removeAttribute("data-theme");
        return;
      }
    } catch (e) {
      // tűrjük a hibát, ne törjön a UI
      console.warn("ThemeSync error", e);
    }
  }, [theme]);

  return null;
}
