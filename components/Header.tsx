"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header
      className="d-flex justify-content-between align-items-center px-4 py-2 bg-dark text-light"
      style={{ position: "fixed", top: 0, width: "100%", zIndex: 1000 }}
    >
      <h1 className="h4 mb-0">Lumen – Elemző AI</h1>
      <nav className="d-flex gap-3">
        <Link href="/" className="text-light text-decoration-none">
          🏠 Főoldal
        </Link>
        <Link href="/trends" className="text-light text-decoration-none">
          🔥 Trendek
        </Link>
      </nav>
    </header>
  );
}
