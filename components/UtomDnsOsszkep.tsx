"use client";

import React, { useEffect, useState } from "react";

interface Props {
  domain: string;
}

// Kötelező API fetcher — x-api-key headerrel
const fetcher = (url: string): Promise<any> =>
  fetch(url, {
    headers: {
      "x-api-key": "",
    } as HeadersInit,
  }).then(async (r) => {
    if (!r.ok) throw new Error(`dns_overview_http_${r.status}`);
    const data = await r.json();
    if (!data || typeof data !== "object") throw new Error("dns_overview_invalid_response");
    return data;
  });

export default function UtomDnsOsszkep({ domain }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const json = await fetcher(
          `/api/premium-insights/UtomDnsOsszkep?${new URLSearchParams({ domain }).toString()}`
        );

        if (mounted && json?.success) {
          setData(json);
        }
      } catch (err) {
        console.error("DNS összkép API hiba:", err);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setLoading(true);
    setData(null);
    load();
    return () => {
      mounted = false;
    };
  }, [domain]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        Betöltés...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        Nincs adat.
      </div>
    );
  }

  const finiteNonNegative = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  // TÍPUSOS DESTRUCTURING
  const {
    totalArticles,
    dailyArticles,
    weeklyArticles,
    monthlyArticles,
    avgWordCount,
    avgReadingTime,
    topTopic,
    diversityIndex,
    dominanceIndex,
  } = data;

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        lineHeight: "1.8",
        fontSize: "16px",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>Tartalmi összkép</h2>

      <div style={{ display: "inline-block", textAlign: "left" }}>
        <div>
          <strong>Összes cikk:</strong>{" "}
          {finiteNonNegative(totalArticles).toLocaleString("hu-HU")}
        </div>

        <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
          <li>
            <strong>Napi cikkek száma:</strong> {finiteNonNegative(dailyArticles)}
          </li>
          <li>
            <strong>Heti cikkek száma:</strong> {finiteNonNegative(weeklyArticles)}
          </li>
          <li>
            <strong>Havi cikkek száma:</strong> {finiteNonNegative(monthlyArticles)}
          </li>
        </ul>

        <div style={{ marginTop: "15px" }}>
          <strong>Átlagos cikkhossz:</strong>{" "}
          {finiteNonNegative(avgWordCount) > 0 ? `${finiteNonNegative(avgWordCount)} szó` : "N/A"}
        </div>

        <div>
          <strong>Átlagos olvasási idő:</strong>{" "}
          {finiteNonNegative(avgReadingTime) > 0 ? `${finiteNonNegative(avgReadingTime)} perc` : "N/A"}
        </div>

        {/* ⭐ Diverzitás */}
        <div style={{ marginTop: "15px" }}>
          <strong>Diverzitás index:</strong>{" "}
          {(finiteNonNegative(diversityIndex) * 100).toFixed(1)}%
        </div>

        {/* ⭐ Dominancia */}
        <div>
          <strong>Dominancia index:</strong>{" "}
          {(finiteNonNegative(dominanceIndex) * 100).toFixed(1)}%
        </div>

        {/* ⭐ Leggyakoribb téma */}
        <div style={{ marginTop: "15px" }}>
          <strong>Leggyakoribb téma:</strong>{" "}
          {topTopic || "Nincs domináns téma"}
        </div>
      </div>
    </div>
  );
}
