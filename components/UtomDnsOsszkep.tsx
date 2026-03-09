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

// Kategória típus
type CategoryMap = Record<
  | "Politika"
  | "Gazdaság"
  | "Közélet"
  | "Kultúra"
  | "Sport"
  | "Tech"
  | "Egészségügy"
  | "Oktatás",
  number
>;

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

  // TÍPUSOS DESTRUCTURING — EZ OLDJA MEG A HIBÁT
  const {
    totalArticles,
    dailyArticles,
    weeklyArticles,
    monthlyArticles,
    avgWordCount,
    avgReadingTime,
    categories,
    topTopic,
  }: {
    totalArticles: number;
    dailyArticles: number;
    weeklyArticles: number;
    monthlyArticles: number;
    avgWordCount: number;
    avgReadingTime: number;
    categories: CategoryMap;
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

        <div style={{ marginTop: "15px" }}>
          <strong>Leggyakoribb téma:</strong> {topTopic}
        </div>

        <hr style={{ margin: "20px 0", opacity: 0.3 }} />

        <h3>Kategóriaeloszlás</h3>
        <ul style={{ paddingLeft: "20px" }}>
          {Object.entries(categories).map(([cat, val]) => (
            <li key={cat}>
              <strong>{cat}:</strong> {val}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
