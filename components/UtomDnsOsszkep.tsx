"use client";

import React, { useEffect, useState } from "react";

interface Props {
  domain: string;
}

// Kötelező API fetcher — x-api-key headerrel
const fetcher = (url: string): Promise<any> =>
  fetch(url, {
    headers: {
      "x-api-key": String(process.env.NEXT_PUBLIC_UTOM_API_KEY),
    } as HeadersInit,
  }).then((r) => r.json());

export default function UtomDnsOsszkep({ domain }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const json = await fetcher(
          `/api/insights/UtomDnsOsszkep?domain=${domain}`
        );

        if (json?.success) {
          setData(json);
        }
      } catch (err) {
        console.error("DNS összkép API hiba:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
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

  // TÍPUSOS DESTRUCTURING
  const {
    totalArticles,
    dailyArticles,
    weeklyArticles,
    monthlyArticles,
    avgWordCount,
    avgReadingTime,
    topTopic, // ⭐ diverzitás
  }: {
    totalArticles: number;
    dailyArticles: number;
    weeklyArticles: number;
    monthlyArticles: number;
    avgWordCount: number;
    avgReadingTime: number;
    topTopic: string;
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
          {totalArticles?.toLocaleString("hu-HU")}
        </div>

        <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
          <li>
            <strong>Napi cikkek száma:</strong> {dailyArticles}
          </li>
          <li>
            <strong>Heti cikkek száma:</strong> {weeklyArticles}
          </li>
          <li>
            <strong>Havi cikkek száma:</strong> {monthlyArticles}
          </li>
        </ul>

        <div style={{ marginTop: "15px" }}>
          <strong>Átlagos cikkhossz:</strong>{" "}
          {avgWordCount > 0 ? `${avgWordCount} szó` : "N/A"}
        </div>

        <div>
          <strong>Átlagos olvasási idő:</strong>{" "}
          {avgReadingTime > 0 ? `${avgReadingTime} perc` : "N/A"}
        </div>

        {/* ⭐ Diverzitás / Leggyakoribb téma */}
        <div style={{ marginTop: "15px" }}>
          <strong>Leggyakoribb téma:</strong>{" "}
          {topTopic || "Nincs domináns téma"}
        </div>

        {/* ❌ Kategóriaeloszlás teljesen törölve */}
      </div>
    </div>
  );
}
