"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";
import ProfileMenu from "./ProfileMenu";
import { useUserStore } from "@/store/useUserStore";

export default function Header() {
  const pathname = usePathname();

  const user = useUserStore((s) => s.user);
  const loading = useUserStore((s) => s.loading);

  const searchTerm = useUserStore((s) => s.searchTerm);
  const setSearchTerm = useUserStore((s) => s.setSearchTerm);
  const theme = useUserStore((s) => s.theme);
  const setTheme = useUserStore((s) => s.setTheme);

  const [localSearch, setLocalSearch] = useState<string>(searchTerm);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isLanding = pathname.startsWith("/landing");

  const isLegalPage =
    pathname.startsWith("/aszf") ||
    pathname.startsWith("/impresszum") ||
    pathname.startsWith("/adatvedelem");

  useEffect(() => {
    // Betölti a felhasználót; a perzisztált theme-et hagyja érintetlenül
    useUserStore.getState().loadUser?.();
  }, []);

  const isPremium = (() => {
    const u = user;
    if (!u) return false;
    return u.isPremium === true;
  })();

  const reallyPremium = isPremium;

  // isDark kezelése: alapérték false, de useLayoutEffect korán beállítja a perzisztált theme alapján
  const [isDark, setIsDark] = useState<boolean>(false);

  // A perzisztált theme korai beolvasása a villogás elkerüléséhez
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem("utom-store");
      let parsedTheme: string | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          parsedTheme = parsed?.state?.theme ?? parsed?.theme ?? null;
        } catch {
          parsedTheme = null;
        }
      }

      if (parsedTheme === "dark") {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      } else if (parsedTheme === "light") {
        setIsDark(false);
        document.documentElement.classList.remove("dark");
      } else {
        // system vagy nincs perzisztált beállítás -> media query alapján dönt
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(!!prefersDark);
        if (prefersDark) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }

      // Szinkronizáljuk a store-t, ha eltérés van
      if (parsedTheme && parsedTheme !== theme) {
        setTheme(parsedTheme as "dark" | "light" | "system");
      }
    } catch {
      // Hiba esetén media query-re esünk vissza
      try {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(!!prefersDark);
        if (prefersDark) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // egyszer fusson mount előtt

  // Reagálás a store.theme változásaira (felhasználói váltás)
  useEffect(() => {
    if (theme === "dark") {
      setIsDark(true);
      try {
        document.documentElement.classList.add("dark");
      } catch {}
      return;
    }
    if (theme === "light") {
      setIsDark(false);
      try {
        document.documentElement.classList.remove("dark");
      } catch {}
      return;
    }
    // system
    if (typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        try {
          if (e.matches) document.documentElement.classList.add("dark");
          else document.documentElement.classList.remove("dark");
        } catch {}
      };
      setIsDark(mql.matches);
      try {
        if (mql.addEventListener) mql.addEventListener("change", handler);
        else mql.addListener(handler as any);
      } catch {}
      return () => {
        try {
          if (mql.removeEventListener) mql.removeEventListener("change", handler);
          else mql.removeListener(handler as any);
        } catch {}
      };
    }
  }, [theme]);

  const logoSrc = isLegalPage || isDark ? "/web-app-manifest-512x512.png" : "/utom.png";

  const menuLoggedOut = [
    { href: "/", label: "Főoldal" },
    { href: "/aszf", label: "ÁSZF" },
    { href: "/impresszum", label: "Impresszum" },
    { href: "/kapcsolat", label: "Kapcsolat" },
  ];

  const menuFree = menuLoggedOut;

  const menuPremium = [
    { href: "/", label: "Főoldal" },
    { href: "/insights", label: "Insights" },
    { href: "/trends", label: "Kulcsszavak" },
    { href: "/aszf", label: "ÁSZF" },
    { href: "/impresszum", label: "Impresszum" },
    { href: "/adatvedelem", label: "Adatvédelem" },
    { href: "/kapcsolat", label: "Kapcsolat" },
  ];

  const activeMenu = !user ? menuLoggedOut : reallyPremium ? menuPremium : menuFree;

  if (isLanding) return null;

  return (
    <nav
      className={`navbar navbar-expand-lg sticky-top header-nav ${isLegalPage ? "header-legal" : ""}`}
    >
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <Link href="/" className="navbar-brand d-flex align-items-center">
          <Image
            key={isDark ? "logo-dark" : "logo-light"}
            src={logoSrc}
            alt="Utom.hu logó"
            width={48}
            height={48}
            priority
            className="header-logo-img"
            style={{ objectFit: "contain" }}
          />
        </Link>

        {pathname === "/" && (
          <div className="search-wrapper mx-auto">
            <div
              className="search-box"
              onClick={() => inputRef.current?.focus()}
              role="presentation"
            >
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Keresés..."
                className="search-input"
                value={localSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalSearch(value);
                  setSearchTerm(value);
                }}
                aria-label="Keresés"
              />
              {localSearch.length > 0 && (
                <span
                  className="search-clear"
                  onClick={() => {
                    setLocalSearch("");
                    setSearchTerm("");
                    inputRef.current?.focus();
                  }}
                >
                  ×
                </span>
              )}
            </div>
            <div className="search-status">{isTyping ? "Keresés folyamatban…" : ""}</div>
          </div>
        )}

        <div className="d-flex align-items-center gap-3 ms-auto">
          <ul className="navbar-nav d-flex flex-row gap-3 align-items-center mb-0">
            {activeMenu.map((item) => (
              <li key={item.href} className="nav-item">
                <Link href={item.href} className="nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center">
            {!user && <LoginModal />}
            {user && <ProfileMenu />}
          </div>
        </div>
      </div>
    </nav>
  );
}
