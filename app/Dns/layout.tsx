// app/dns/layout.tsx
"use client";

import React from "react";

export default function DnsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dns-page"
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        background: "#071226"
      }}
    >
      <header
        className="dns-header"
        style={{
          height: 64,
          flex: "0 0 64px",
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          background: "#071226",
          zIndex: 40
        }}
      >
        <h1 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Részletes profil
        </h1>
      </header>

      <main className="dns-main" style={{ flex: "1 1 auto", minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}
