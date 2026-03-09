"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";
import Skeleton from "@/components/Skeleton";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": String(process.env.NEXT_PUBLIC_UTOM_API_KEY),
    },
  }).then((r) => r.json());

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, isLoading } = useSWR(
    "/api/insights/source-category-distribution",
    fetcher
  );

  const domains: string[] = data?.items?.map((i: any) => i.source) ?? [];

  const showSkeleton = !domain; // skeleton addig, amíg nincs domain

  return (
    <div style={{ padding: "20px" }}>
      
      {/* HEADER – domain választó */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
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
                color: isDark ? "#fff" : "#000",
                transition: "0.25s",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Üzenet a gombok alatt – csak ha nincs domain */}
        {!domain && (
          <div style={{ marginTop: "10px", fontSize: "16px" }}>
            Válassz egy domaint fent.
          </div>
        )}
      </div>

      {/* 3 DOBOZOS LAYOUT */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {/* BAL OLDALI DOBOZ – CHART */}
        <div
          style={{
            width: "360px",
            padding: "20px",
            borderRadius: "16px",
            background: "transparent",
            border: "none",
            minHeight: "400px",
          }}
        >
          {showSkeleton ? (
            <>
              <Skeleton height="24px" width="60%" />
              <div style={{ marginTop: "20px" }}>
                <Skeleton height="210px" width="210px" radius={210} />
              </div>
            </>
          ) : (
            <UtomDnsKategoria
              key={domain + "_" + (isDark ? "dark" : "light")}
              domain={domain}
            />
          )}
        </div>

        {/* KÖZÉPSŐ DOBOZ */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            borderRadius: "16px",
            background: "transparent",
            border: "none",
            minHeight: "400px",
          }}
        >
          {showSkeleton ? (
            <>
              <Skeleton height="20px" width="80%" />
              <Skeleton height="20px" width="60%" />
              <Skeleton height="20px" width="90%" />
            </>
          ) : null}
        </div>

        {/* JOBB OLDALI DOBOZ */}
        <div
          style={{
            width: "300px",
            padding: "20px",
            borderRadius: "16px",
            background: "transparent",
            border: "none",
            minHeight: "400px",
          }}
        >
          {showSkeleton ? (
            <>
              <Skeleton height="20px" width="70%" />
              <Skeleton height="20px" width="50%" />
              <Skeleton height="20px" width="90%" />
            </>
          ) : null}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: "40px", textAlign: "center", opacity: 0.6 }}>
      </div>
    </div>
  );
}
