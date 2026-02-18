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

  // ⭐ A KERESŐ MOSTANTÓL ZUSTANDOT HASZNÁL
  const searchTerm = useUserStore((s) => s.searchTerm);
  const setSearchTerm = useUserStore((s) => s.setSearchTerm);

  const [localSearch, setLocalSearch] = useState<string>(searchTerm);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (pathname.startsWith("/landing")) return null;

  // Sync localSearch when external searchTerm changes
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Debounce localSearch -> setSearchTerm
  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setSearchTerm(localSearch);
      setIsTyping(false);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchTerm]);

  // Handle Enter to immediately apply search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchTerm(localSearch);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg shadow-sm sticky-top header-nav">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        {/* LOGÓ */}
        <Link href="/" className="navbar-brand d-flex align-items-center">
          <Image
            src="/apple-touch-icon.png"
            alt="Utom.hu logó"
            width={72}
            height={72}
            priority
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
            <li className="nav-item">
              <Link href="/" className="nav-link">
                Főoldal
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/trends" className="nav-link">
                Kulcsszavak
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/adatvedelem" className="nav-link">
                Adatvédelem
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/kapcsolat" className="nav-link">
                Kapcsolat
              </Link>
            </li>
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
