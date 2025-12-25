"use client";

import Link from "next/link";

export default function Header() {
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
