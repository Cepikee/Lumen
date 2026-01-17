"use client";

import Link from "next/link";
import { useContext, useState, useEffect } from "react";
import { LayoutContext } from "./LayoutContext";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import { useUser } from "@/hooks/useUser";
import ProfileMenu from "./ProfileMenu";

export default function Header() {
  const layout = useContext(LayoutContext);
  const pathname = usePathname();
  const { user, loading } = useUser();

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
  }, [localSearch]);

  return (
    <nav className="navbar navbar-expand-lg bg-body shadow-sm sticky-top position-relative">
      <div className="container-fluid">

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
        <div className="w-100 d-flex flex-column align-items-center my-3">
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

        {/* NAVIGATION */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link href="/" className="nav-link">Főoldal</Link>
            </li>
            <li className="nav-item">
              <Link href="/trends" className="nav-link">Kulcsszavak</Link>
            </li>
            <li className="nav-item">
              <Link href="/adatvedelem" className="nav-link">Adatvédelem</Link>
            </li>
          </ul>
        </div>

        {/* 🔧 PROFIL IKON TELJES JOBB SZÉLEN */}
        <div className="position-absolute end-0 top-0 me-3 mt-2 d-flex align-items-center">
          {loading && <span className="text-muted">Betöltés…</span>}
          {!loading && !user && (
            <>
              <LoginModal />
              <RegisterModal />
            </>
          )}
          {!loading && user && <ProfileMenu user={user} />}
        </div>

      </div>
    </nav>
  );
}
