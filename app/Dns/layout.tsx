"use client";

import React, { useState } from "react";

export default function DnsLayout({ children }: { children: React.ReactNode }) {
  const [domain, setDomain] = useState("");

  const domains = ["444.hu", "origo.hu", "telex.hu", "index.hu"];

  return (
    <div
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
        style={{
          height: 64,
          flex: "0 0 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 20px",
          background: "#071226",
          zIndex: 40
        }}
      >
        <h1 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Részletes profil
        </h1>

        {/* iPhone glass gombok a header alatt */}
        <div style={{ marginTop: "10px" }}>
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => {
                // domain átadása a gyerek oldalaknak
                // window eventtel vagy contexttel is lehet, de most egyszerűbb:
                localStorage.setItem("selectedDomain", d);
                window.dispatchEvent(new Event("domain-change"));
              }}
              style={{
                padding: "10px 20px",
                margin: "6px",
                cursor: "pointer",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#fff",
                fontSize: "14px",
                transition: "0.25s",
                boxShadow: "0 0 3px rgba(0,0,0,0.15)"
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: "1 1 auto", minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}
