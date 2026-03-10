"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
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

  const [localSearch, setLocalSearch] = useState<string>(searchTerm);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (pathname.startsWith("/landing")) return null;

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setSearchTerm(localSearch);
      setIsTyping(false);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchTerm(localSearch);
    }
  };

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const logoSrc = isDark ? "/web-app-manifest-512x512.png" : "/utom.png";

  // -------------------------
  // ⭐ Prémium státusz (helyes, típus-kompatibilis)
  // -------------------------
  const isPremium = user?.is_premium === true;

  // -------------------------
  // ⭐ Menüprofilok
  // -------------------------
  const menuLoggedOut = [
    { href: "/", label: "Főoldal" },
    { href: "/aszf", label: "ÁSZF" },
    { href: "/impresszum", label: "Impresszum" },
    { href: "/kapcsolat", label: "Kapcsolat" },
  ];

  const menuFree = [
    { href: "/", label: "Főoldal" },
    { href: "/aszf", label: "ÁSZF" },
    { href: "/impresszum", label: "Impresszum" },
    { href: "/kapcsolat", label: "Kapcsolat" },
  ];

  const menuPremium = [
    { href: "/", label: "Főoldal" },
    { href: "/insights", label: "Insights" },
    { href: "/trends", label: "Kulcsszavak" },
    { href: "/aszf", label: "ÁSZF" },
    { href: "/impresszum", label: "Impresszum" },
    { href: "/adatvedelem", label: "Adatvédelem" },
    { href: "/kapcsolat", label: "Kapcsolat" },
  ];

  const activeMenu = !user
    ? menuLoggedOut
    : isPremium
    ? menuPremium
    : menuFree;

  return (
    <nav className="navbar navbar-expand-lg shadow-sm sticky-top header-nav">
      <div className="container-fluid d-flex align-items-center justify-content-between">

        {/* LOGÓ */}
        <Link href="/" className="navbar-brand d-flex align-items-center">
          <Image
            src={logoSrc}
            alt="Utom.hu logó"
            width={48}
            height={48}
            priority
            className="header-logo-img"
            style={{ objectFit: "contain" }}
          />
        </Link>

        {/* KERESŐ — csak a főoldalon */}
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
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={handleKeyDown}
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
            <div className="search-status">
              {isTyping ? "Keresés folyamatban…" : ""}
            </div>
          </div>
        )}

        {/* NAV + PROFIL */}
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
            {loading && <span className="text-muted">Betöltés…</span>}
            {!loading && !user && <LoginModal />}
            {!loading && user && <ProfileMenu />}
          </div>
        </div>
      </div>
    </nav>
  );
}
