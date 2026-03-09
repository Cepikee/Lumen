"use client";

import React, { useState } from "react";
import useSWR from "swr";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": String(process.env.NEXT_PUBLIC_UTOM_API_KEY),
    },
  }).then((r) => r.json());

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  // 🔥 Ugyanazt az API-t használjuk, mint a kategória eloszlásnál
  const { data, error } = useSWR("/api/insights/source-category-distribution", fetcher);

  // 🔥 Dinamikus domain lista
  const domains: string[] = data?.items?.map((i: any) => i.source) ?? [];

  return (
    <div>
      {/* Domain választó gombok */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ marginTop: "10px" }}>
          {domains.length === 0 && <div style={{ color: "#fff" }}>Betöltés…</div>}

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
                background:
                  domain === d
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#fff",
                fontSize: "14px",
                transition: "0.25s",
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

      {/* Chart */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <UtomDnsKategoria domain={domain} />
      </div>
    </div>
  );
}
