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

export default function WSourceClickbaitPro() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/clickbait",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div>Betöltés…</div>;
  if (error || !data?.success) return <div>Hiba történt.</div>;

  const sources = (data.sources || [])
    .map((s: any) => ({
      name: s.source,
      score: Number(s.avg_clickbait),
    }))
    .sort((a: any, b: any) => b.score - a.score);

  const avg =
    sources.length > 0
      ? sources.reduce((acc: number, s: any) => acc + s.score, 0) / sources.length
      : 0;

  const getBarColor = (score: number) => {
    if (score >= 60) return "#ef4444";
    if (score >= 45) return "#f97316";
    if (score >= 35) return "#eab308";
    return "#22c55e";
  };

  return (
    <>
      <div
        className={`relative p-10 rounded-3xl overflow-hidden wsource-card--ghost ${isDark ? "text-white" : "text-slate-900"}`}
        style={{ background: "var(--bs-body-bg, #f8fafc)" }}
      >
        {/* header: cím középre, info gomb jobbra */}
        <div className="flex items-center justify-center gap-4 mb-6">

          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Források átlagos clickbait pontszáma
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

        {/* subtle background glow (meglévő vizuális elem) */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: isDark ? "rgba(79,70,229,0.10)" : "rgba(0,0,0,0.03)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: isDark ? "rgba(147,51,234,0.10)" : "rgba(0,0,0,0.03)",
          }}
        />

        {/* MAIN CHART */}
        <div className="relative z-10 h-[440px]">
          <ResponsiveContainer width="100%" height="100%" className="bg-[var(--bs-body-bg)]">
            <BarChart
              key={isDark ? "dark" : "light"}
              layout="vertical"
              data={sources}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <XAxis
                type="number"
                domain={[0, 70]}
                stroke={isDark ? "#cbd5e1" : "#475569"}
                tick={{ fill: isDark ? "#e2e8f0" : "#334155" }}
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
                formatter={(value?: number) => [(value ?? 0).toFixed(2), "Score"]}
              />

              <Bar dataKey="score" radius={[0, 14, 14, 0]} animationDuration={900}>
                <LabelList
                  dataKey="score"
                  position="right"
                  fill={isDark ? "#ffffff" : "#000000"}
                  formatter={(value: any) => {
                    const num = Number(value);
                    return isNaN(num) ? "" : num.toFixed(1);
                  }}
                  style={{ fontSize: "14px", fontWeight: 600 }}
                />

                {sources.map((entry: any, index: number) => (
                  <Cell
                    key={index}
                    fill={getBarColor(entry.score)}
                    stroke={index < 3 ? "rgba(255,255,255,0.4)" : "none"}
                    strokeWidth={index < 3 ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rövid, emberbarát magyarázat — nincs adatbázis részlet */}
      <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title="Mit mér ez a grafikon?">
        <div className="text-sm leading-relaxed">
          <p className="mb-3">
            A grafikon azt mutatja, hogy egy forrásnál átlagosan mennyire jellemzőek a clickbait jellegű címek és bevezetések.
          </p>

          <p className="mb-2">
            A rendszer minden cikket pontoz; ha a pontszám eléri a belső küszöböt, a cikket clickbaitnek tekintjük.
          </p>

          <p className="mb-2">
            A diagramon látható érték az egy forrásra jutó átlagos pontszám, azaz mennyire „clickbaites” az adott forrás átlagosan.
          </p>

          <p className="mt-3">
            Ez egy automatikus, összehasonlító mutató — hasznos trendek és különbségek feltárására, de nem helyettesíti az emberi értékelést.
          </p>
        </div>
      </UtomModal>
    </>
  );
}
