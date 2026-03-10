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

  // -------------------------
  // USER LOAD FIX
  // -------------------------
  useEffect(() => {
    useUserStore.getState().loadUser?.();
  }, []);

  // -------------------------
  // API USER CHECK (mint az Insights oldalon)
  // -------------------------
  const [apiUser, setApiUser] = useState<any | null>(null);
  const [apiChecked, setApiChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : null;
        if (mounted) setApiUser(parsed);
      } catch {
        if (mounted) setApiUser(null);
      } finally {
        if (mounted) setApiChecked(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // -------------------------
  // PRÉMIUM DETEKTOR (1:1 ugyanaz, mint Insights oldalon)
  // -------------------------
  const isPremium = (() => {
    const u = user;
    if (!u) return false;

    if (typeof u.is_premium === "boolean") return u.is_premium === true;
    if (typeof (u as any).isPremium === "boolean") return (u as any).isPremium === true;
    if (typeof u.is_premium === "number") return Number(u.is_premium) === 1;
    if (u.premium_tier) return true;

    return false;
  })();

  const apiSaysPremium = (() => {
    const a = apiUser?.user ?? apiUser;
    if (!a) return false;

    if (a.is_premium === true) return true;
    if (a.is_premium === 1) return true;
    if (a.isPremium === true) return true;
    if (a.premium_tier) return true;

    return false;
  })();

  const reallyPremium = isPremium || apiSaysPremium;

  // -------------------------
  // MENÜK
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
    : reallyPremium
    ? menuPremium
    : menuFree;

  // -------------------------
  // KERESŐ + HEADER RENDER
  // -------------------------
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const logoSrc = isDark ? "/web-app-manifest-512x512.png" : "/utom.png";

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
            {!user && <LoginModal />}
            {user && <ProfileMenu />}
          </div>
        </div>
      </div>
    </nav>
  );
}
