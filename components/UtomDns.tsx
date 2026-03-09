"use client";

import React, { useState } from "react";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  const domains = ["444.hu", "origo.hu", "telex.hu", "index.hu"];

  return (
    <div>
      {/* Középre igazított részletes profil */}
<div style={{ textAlign: "center", marginBottom: "2px" }}>

 {/* Domain választó gombok – iPhone glass style (finomabb fény) */}
<div style={{ marginTop: "10px" }}>
  {domains.map((d) => (
    <button
      key={d}
      onClick={() => setDomain(d)}
      style={{
        padding: "10px 20px",
        margin: "6px",
        cursor: "pointer",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.18)",
        background: domain === d
          ? "rgba(255,255,255,0.22)"
          : "rgba(255,255,255,0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#fff",
        fontSize: "14px",
        transition: "0.25s",

        // 🔥 finomabb glow, kevésbé világít
        boxShadow:
          domain === d
            ? "0 0 6px rgba(255,255,255,0.25)"
            : "0 0 3px rgba(0,0,0,0.15)",
      }}
    >
      {d}
    </button>
  ))}
</div>


</div>


      {/* Chart megjelenítése */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <UtomDnsKategoria domain={domain} />
      </div>
    </div>
  );
}
