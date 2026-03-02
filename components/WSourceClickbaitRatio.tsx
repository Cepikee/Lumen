"use client";

import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import { useState } from "react";
import UtomModal from "@/components/UtomModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceClickbaitRatio() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/clickbait-ratio",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div>Betöltés…</div>;
  if (error || !data?.success) return <div>Hiba történt.</div>;

  const sources = (data.sources || [])
    .map((s: any) => ({
      name: s.source,
      ratio: Number(s.ratio) * 100, // százalékosítjuk
    }))
    .sort((a: any, b: any) => b.ratio - a.ratio);

  const getBarColor = (ratio: number) => {
    if (ratio >= 60) return "#ef4444";   // piros
    if (ratio >= 45) return "#f97316";   // narancs
    if (ratio >= 30) return "#eab308";   // sárga
    return "#22c55e";                    // zöld
  };

  return (
    <>
      <div
        /* újrahasznosítjuk a meglévő "ghost" osztályt, nincs új CSS */
        className={`relative p-10 rounded-3xl overflow-hidden wsource-card--ghost ${isDark ? "text-white" : "text-slate-900"}`}
        style={{ background: "var(--bs-body-bg, #f8fafc)" }}
      >
        {/* header: cím + info gomb (26x26, csak SVG) */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Források clickbait arányai
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            aria-label="Információ"
            type="button"
            className="w-[26px] h-[26px] p-0 m-0 flex items-center justify-center bg-transparent border-0"
            style={{ width: 26, height: 26 }}
          >
            <img
              src="/icons/info-svg.svg"
              alt="info"
              className="w-[26px] h-[26px] object-contain pointer-events-none"
              width={26}
              height={26}
              style={{ display: "block" }}
            />
          </button>
        </div>

        {/* subtle background glow */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: isDark
              ? "rgba(79,70,229,0.10)"
              : "rgba(0,0,0,0.03)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: isDark
              ? "rgba(147,51,234,0.10)"
              : "rgba(0,0,0,0.03)",
          }}
        />

        {/* MAIN CHART */}
        <div className="relative z-10 h-[440px]">
          <ResponsiveContainer width="100%" height="100%" className="apexcharts-plot-area">
            <BarChart
              key={isDark ? "dark" : "light"}
              layout="vertical"
              data={sources}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke={isDark ? "#cbd5e1" : "#475569"}
                tick={{ fill: isDark ? "#e2e8f0" : "#334155" }}
                tickFormatter={(v) => `${v}%`}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={130}
                stroke={isDark ? "#e2e8f0" : "#334155"}
                tick={{ fill: isDark ? "#e2e8f0" : "#334155" }}
              />

              {/* hover háttér kikapcsolva */}
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
                  borderRadius: "12px",
                  color: isDark ? "#f1f5f9" : "#0f172a",
                }}
                labelStyle={{
                  color: isDark ? "#f8fafc" : "#0f172a",
                  fontWeight: 600,
                }}
                itemStyle={{
                  color: isDark ? "#ffffff" : "#000000",
                  fontWeight: 500,
                }}
                formatter={(value?: number) => [
                  `${(value ?? 0).toFixed(1)}%`,
                  "Clickbait arány",
                ]}
              />

              <Bar dataKey="ratio" radius={[0, 14, 14, 0]} animationDuration={900}>
                <LabelList
                  dataKey="ratio"
                  position="right"
                  fill={isDark ? "#ffffff" : "#000000"}
                  formatter={(value: any) => {
                    const num = Number(value);
                    return isNaN(num) ? "" : `${num.toFixed(1)}%`;
                  }}
                  style={{ fontSize: "14px", fontWeight: 600 }}
                />

                {sources.map((entry: any, index: number) => (
                  <Cell
                    key={index}
                    fill={getBarColor(entry.ratio)}
                    stroke={index < 3 ? "rgba(255,255,255,0.4)" : "none"}
                    strokeWidth={index < 3 ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info modal — clickbait magyarázat */}
      <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title="Mi az a clickbait arány?">
        <div className="text-sm leading-relaxed">
          <p className="mb-3">
            A clickbait arány azt mutatja meg, hogy egy adott forrás milyen gyakran használ olyan cím- vagy bevezetőelemeket,
            amelyek célja a kattintás maximalizálása (érzelmi túlzás, félrevezető fókusz, túlzó állítások).
          </p>

          <p className="mb-2">
            <strong>Mérés alapja:</strong> automatikus cím- és lead‑elemzés szabályok és gépi tanulás alapján.
          </p>

          <p className="mb-2">
            <strong>Skála:</strong> az érték százalékban van megadva — magasabb százalék több clickbait jellegű tartalmat jelez.
          </p>

          <p className="mt-3">
            Fontos: ez egy automatikus mutató, nem helyettesíti az emberi szerkesztői értékelést; kontextus és témaválasztás is befolyásolhatja az eredményt.
          </p>
        </div>
      </UtomModal>
    </>
  );
}
