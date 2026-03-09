"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": String(process.env.NEXT_PUBLIC_UTOM_API_KEY),
    },
  }).then((r) => r.json());

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  // 🔥 Téma lekérése
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // 🔥 Dinamikus domain lista
  const { data, error } = useSWR(
    "/api/insights/source-category-distribution",
    fetcher
  );

  const domains: string[] = data?.items?.map((i: any) => i.source) ?? [];

  return (
    <div>
      {/* Domain választó gombok */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div style={{ marginTop: "10px" }}>
          {domains.length === 0 && (
            <div style={{ color: isDark ? "#fff" : "#000" }}>Betöltés…</div>
          )}

          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              style={{
                padding: "10px 20px",
                margin: "6px",
                cursor: "pointer",
                borderRadius: "14px",

                // ⭐ Témafüggő színek
                border: isDark
                  ? "1px solid rgba(255,255,255,0.18)"
                  : "1px solid rgba(0,0,0,0.18)",

                background:
                  domain === d
                    ? isDark
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.15)"
                    : isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.08)",

                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",

                color: isDark ? "#fff" : "#000",
                fontSize: "14px",
                transition: "0.25s",

                // ⭐ Témafüggő árnyék
                boxShadow:
                  domain === d
                    ? isDark
                      ? "0 0 6px rgba(255,255,255,0.25)"
                      : "0 0 6px rgba(0,0,0,0.25)"
                    : isDark
                    ? "0 0 3px rgba(0,0,0,0.3)"
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
