// TrendsDebug.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Filters } from "./TrendsFilters";

interface Props {
  filters: Filters;
}

/**
 * Debug komponens: lekéri az /api/trends endpointot a kapott filterekkel,
 * és konzolra kiírja a teljes request URL-t, valamint a választ.
 *
 * Másold be a projektedbe: components/TrendsDebug.tsx (vagy ahol a TrendsFilters is van),
 * majd importáld és rendereld a panelben a TrendsFilters mellé.
 */
export default function TrendsDebug({ filters }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    let mounted = true;
    const requestId = ++requestSequence.current;
    async function fetchTrends() {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (filters.period) qs.set("period", filters.period);
      if (filters.sources && filters.sources.length) qs.set("sources", filters.sources.join(","));
      if (filters.categories && filters.categories.length) qs.set("categories", filters.categories.join(","));
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate) qs.set("endDate", filters.endDate);
      if (filters.keyword) qs.set("keyword", filters.keyword);
      if (filters.sort) qs.set("sort", filters.sort);

      const url = `/api/trends?${qs.toString()}`;

      // Debug: konzolra írjuk a teljes URL-t és a query paramokat
      console.log("DEBUG /api/trends REQUEST URL:", url);
      console.log("DEBUG /api/trends SENT PARAMS:", {
        period: filters.period,
        sources: filters.sources,
        categories: filters.categories,
        startDate: filters.startDate,
        endDate: filters.endDate,
        keyword: filters.keyword,
        sort: filters.sort
      });

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`trends_debug_http_${res.status}`);
        const json = await res.json();
        if (!json || typeof json !== "object") throw new Error("trends_debug_invalid_response");
        // Debug: backend válasz
        console.log("DEBUG /api/trends RESPONSE status:", res.status);
        console.log("DEBUG /api/trends RESPONSE body:", json);

        if (!mounted || requestId !== requestSequence.current) return;
        setData(json);
      } catch (err: any) {
        console.error("DEBUG /api/trends FETCH ERROR:", err);
        if (!mounted || requestId !== requestSequence.current) return;
        setError(err?.message ?? String(err));
        setData(null);
      } finally {
        if (mounted && requestId === requestSequence.current) setLoading(false);
      }
    }

    fetchTrends();
    return () => {
      mounted = false;
    };
  }, [
    filters.period,
    filters.sources?.join(","),
    filters.categories?.join(","),
    filters.startDate,
    filters.endDate,
    filters.keyword,
    filters.sort
  ]);

  return (
    <div style={{ padding: 8, border: "1px dashed #ccc", borderRadius: 6, marginTop: 8 }}>
      <strong>Trends API debug</strong>
      <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
        {loading && <div>Betöltés…</div>}
        {error && <div style={{ color: "crimson" }}>Hiba: {error}</div>}
        {!loading && !error && data && (
          <div>
            <div style={{ marginBottom: 6 }}>Válasz (összegzés): <strong>{Array.isArray(data.trends) ? `${data.trends.length} trend` : "n/a"}</strong></div>
            <pre style={{ maxHeight: 240, overflow: "auto", background: "#f8f9fa", padding: 8, borderRadius: 4 }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
        {!loading && !error && !data && <div>Nincs adat még.</div>}
      </div>
    </div>
  );
}
