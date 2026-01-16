"use client";

import Link from "next/link";
import { useContext, useState, useEffect } from "react";
import { LayoutContext } from "./LayoutContext";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";
import { useUser } from "@/hooks/useUser";
import RegisterModal from "./RegisterModal";
export default function Header() {
  const layout = useContext(LayoutContext);
  const pathname = usePathname();
  const { user, loading } = useUser();

  // 🔥 Ha landing oldalon vagyunk → ne jelenjen meg a header
  if (pathname.startsWith("/landing")) {
    return null;
  }

  // Ha valamiért nincs context, fallback
  const searchTerm = layout?.searchTerm ?? "";
  const setSearchTerm = layout?.setSearchTerm ?? (() => {});

  // Lokális kereső state (debounce)
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Gépelés animáció
  const [isTyping, setIsTyping] = useState(false);

  // Debounce + animáció
  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setSearchTerm(localSearch);
      setIsTyping(false);
    }, 300);

    return () => clearTimeout(t);
  }, [localSearch]);

  return (
    <nav className="navbar navbar-expand-lg bg-body shadow-sm sticky-top">
      <div className="container-fluid">

        {/* BRAND + LOGO */}
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
        <div className="w-100 d-flex flex-column align-items-center my-3">
          <div
            className="position-relative"
            style={{
              width: "360px",
              maxWidth: "90%",
            }}
          >
            {/* 🔍 Ikon az inputon belül */}
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

            {/* Keresőmező */}
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

            {/* ❌ Törlés ikon */}
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

          {/* ⏳ Gépelés animáció */}
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

        {/* 🔥 JOBB OLDALI USER RÉSZ */}
        <div className="d-flex align-items-center ms-auto me-3">

          {/* Ha még tölt → semmit nem mutatunk */}
          {loading && (
            <span className="text-muted">Betöltés…</span>
          )}

          {/* Ha nincs user → Bejelentkezés */}
         {!loading && !user && (
                 <>
            <LoginModal />
           <RegisterModal />
                    </>
)}

          {/* Ha van user → Szia + Kilépés */}
          {!loading && user && (
            <div className="d-flex align-items-center gap-3">
              <span className="fw-bold">Szia, {user.email}!</span>

              <button
                className="btn btn-outline-danger btn-sm"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
              >
                Kilépés
              </button>
            </div>
          )}

        </div>

        {/* NAVIGATION */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">

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

          </ul>
        </div>
      </div>
    </nav>
  );
}
