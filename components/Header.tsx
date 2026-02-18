"use client";

import Link from "next/link";
import Image from "next/image";
import { useContext, useState, useEffect } from "react";
import { LayoutContext } from "./LayoutContext";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";
import ProfileMenu from "./ProfileMenu";
import { useUserStore } from "@/store/useUserStore";

export default function Header() {
  const layout = useContext(LayoutContext);
  const pathname = usePathname();

  const user = useUserStore((s) => s.user);
  const loading = useUserStore((s) => s.loading);

  // Landing oldalon nincs header
  if (pathname.startsWith("/landing")) {
    return null;
  }

  // Kereső állapot
  const searchTerm = layout?.searchTerm ?? "";
  const setSearchTerm = layout?.setSearchTerm ?? (() => {});
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setSearchTerm(localSearch);
      setIsTyping(false);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchTerm]);

  return (
    <nav className="header-nav">
      <div className="header-container">

        {/* LOGÓ */}
        <Link href="/" className="header-logo">
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
          <div className="search-wrapper">
            <div className="search-box">
              <span className="search-icon">🔍</span>

              <input
                type="text"
                placeholder="Keresés..."
                className="search-input"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />

              {localSearch.length > 0 && (
                <span className="search-clear" onClick={() => setLocalSearch("")}>
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
        <div className="header-right">
          <ul className="header-menu">
            <li><Link href="/" className="nav-link">Főoldal</Link></li>
            <li><Link href="/trends" className="nav-link">Kulcsszavak</Link></li>
            <li><Link href="/adatvedelem" className="nav-link">Adatvédelem</Link></li>
            <li><Link href="/kapcsolat" className="nav-link">Kapcsolat</Link></li>
          </ul>

          <div className="header-profile">
            {loading && <span className="text-muted">Betöltés…</span>}
            {!loading && !user && <LoginModal />}
            {!loading && user && <ProfileMenu />}
          </div>
        </div>
      </div>
    </nav>
  );
}
