"use client";

import Link from "next/link";
import { useContext, useState, useEffect } from "react";
import { LayoutContext } from "./LayoutContext";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";
import ProfileMenu from "./ProfileMenu";
import { useUserStore } from "@/store/useUserStore"; // 🔥 ZUSTAND

export default function Header() {
  const layout = useContext(LayoutContext);
  const pathname = usePathname();

  // 🔥 GLOBAL USER + LOADING FROM ZUSTAND
  const user = useUserStore((s) => s.user);
  const loading = useUserStore((s) => s.loading);

  if (pathname.startsWith("/landing")) {
    return null;
  }

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
    <nav className="navbar navbar-expand-lg bg-body shadow-sm sticky-top">
      <div className="container-fluid d-flex align-items-center justify-content-between">

        {/* LOGO */}
        <Link href="/" className="navbar-brand d-flex align-items-center gap-3">
          <img
            src="/utomlogo.png"
            alt="Utom.hu logó"
            style={{
              height: "48px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
          <span className="fw-bold fs-4">Utom.hu</span>
        </Link>

        {/* KERESŐ */}
        <div className="d-flex flex-column align-items-center mx-auto">
          <div
            className="position-relative"
            style={{
              width: "360px",
              maxWidth: "90%",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#bbb",
                pointerEvents: "none",
                fontSize: "16px",
              }}
            >
              🔍
            </span>

            <input
              type="text"
              placeholder="Keresés..."
              className="form-control bg-dark text-white border-secondary"
              style={{
                textAlign: "left",
                fontSize: "16px",
                paddingLeft: "36px",
                paddingRight: "32px",
              }}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />

            {localSearch.length > 0 && (
              <span
                onClick={() => setLocalSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "#bbb",
                  fontSize: "18px",
                  userSelect: "none",
                }}
              >
                ×
              </span>
            )}
          </div>

          <div
            style={{
              height: "20px",
              marginTop: "4px",
              fontSize: "14px",
              color: "#aaa",
              textAlign: "center",
            }}
          >
            {isTyping ? "Keresés folyamatban…" : ""}
          </div>
        </div>

        {/* NAVIGATION + PROFIL */}
        <div className="d-flex align-items-center gap-3">
          <ul className="navbar-nav d-flex flex-row gap-3 align-items-center mb-0">
            <li className="nav-item">
              <Link href="/" className="nav-link">Főoldal</Link>
            </li>
            <li className="nav-item">
              <Link href="/trends" className="nav-link">Kulcsszavak</Link>
            </li>
            <li className="nav-item">
              <Link href="/adatvedelem" className="nav-link">Adatvédelem</Link>
            </li>
            <li className="nav-item">
              <Link href="/kapcsolat" className="nav-link">Kapcsolat</Link>
            </li>
          </ul>

          {/* PROFIL IKON / BEJELENTKEZÉS */}
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
