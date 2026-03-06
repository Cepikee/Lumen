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
        className={`relative p-10 rounded-3xl overflow-hidden wsource-card--ghost ${
          isDark ? "text-white" : "text-slate-900"
        }`}
        style={{ background: "var(--bs-body-bg, #f8fafc)" }}
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Források átlagos clickbait pontszáma
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            aria-label="Információ"
            type="button"
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img
              src="/icons/info-svg.svg"
              alt="info"
              className="w-[26px] h-[26px] object-contain pointer-events-none"
            />
          </button>
        </div>

        {/* háttér glow */}
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

        {/* CHART */}
        <div className="relative z-10 h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
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

      {/* 🔥 ÚJ, FELTUNINGOLT UTOM MODAL */}
      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mit mér ez a grafikon?"
      >
        <div className="text-sm leading-relaxed space-y-6">

          {/* Belső cím */}
          <h3 className="text-xl font-bold text-center mb-2">
            Mit jelent az átlagos clickbait pontszám?
          </h3>

          {/* Bevezető */}
          <p className="text-base font-semibold text-center">
            Ez a mutató azt mutatja meg, hogy egy hírforrás
            <span style={{ color: "#f97316" }}> <b>átlagosan mennyire használ</b></span>
            clickbait jellegű címeket és bevezetőket.
          </p>

          {/* Ikonos magyarázat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">🧪</div>
              <p>
                Minden cikk kap egy <b>clickbait pontszámot</b>, amely azt méri,
                mennyire erős a kattintásra ösztönző hatása.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">⚠️</div>
              <p>
                Ha a pontszám elér egy küszöböt, a cikket
                <b> clickbaitnek</b> tekintjük — de a pontszám önmagában is informatív.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📊</div>
              <p>
                A grafikonon látható érték azt mutatja, hogy az adott forrás
                <b>átlagosan milyen clickbait pontszámot</b> ér el a cikkeivel.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">🔍</div>
              <p>
                Ez segít megérteni, mely források alkalmaznak
                <b>agresszívebb címadást</b>, és kik azok, akik visszafogottabbak.
              </p>
            </div>

          </div>

          {/* Kiemelt doboz */}
          <div
            className="p-4 rounded-xl text-center"
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <p className="font-semibold mb-2 text-lg">Mit jelent ez a gyakorlatban?</p>

            <ul className="list-disc list-inside space-y-1 text-left inline-block text-sm">
              <li><b>Alacsony pontszám</b> → visszafogott címadás.</li>
              <li><b>Közepes pontszám</b> → vegyes, néha erősebb címekkel.</li>
              <li><b>Magas pontszám</b> → gyakran alkalmaz túlzó, figyelemfelkeltő címeket.</li>
              <li>A mutató <i>nem minőségi értékelés</i>, csak a címadási stílust méri.</li>
            </ul>
          </div>

          {/* Lezárás */}
          <p className="text-center">
            Az átlagos clickbait pontszám segít átlátni, mely források mennyire
            támaszkodnak erős címadási technikákra a figyelem megszerzéséhez.
          </p>

          <p
            className="text-xs italic text-center mt-6"
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            A rangsor AI által került meghatározásra.
          </p>

        </div>
      </UtomModal>
    </>
  );
}
