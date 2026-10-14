"use client";

import InsightsEmptyState from "./InsightsEmptyState";
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
      "x-api-key": "",
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`clickbait_${r.status}`);
    const json = await r.json();
    if (!json || !Array.isArray(json.sources)) throw new Error("invalid_clickbait_response");
    return json;
  });

export default function WSourceClickbaitPro({ period = "24h", dark = false, embedded = false }: { period?: string; dark?: boolean; embedded?: boolean }) {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark = dark ||
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    `/api/premium-insights/clickbait?period=${encodeURIComponent(period)}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div>Betöltés…</div>;
  if (error || !data?.success) return <div>Hiba történt.</div>;

  const sources = (Array.isArray(data.sources) ? data.sources : [])
    .filter((s: any) => s && s.avg_clickbait != null && String(s.avg_clickbait).trim() !== "" && Number.isFinite(Number(s.avg_clickbait)) && Number(s.avg_clickbait) >= 0 && Number(s.avg_clickbait) <= 100)
    .map((s: any) => ({
      name: typeof s?.source === "string" && s.source.trim() ? s.source : "Ismeretlen forrás",
      score: Number.isFinite(Number(s?.avg_clickbait)) ? Number(s.avg_clickbait) : 0,
      articles: Number.isFinite(Number(s?.count)) ? Math.max(0, Number(s.count)) : 0,
    }))
    .sort((a: any, b: any) => b.score - a.score);

  if (sources.length === 0) {
    return <InsightsEmptyState period={period} />;
  }

  const getBarColor = (score: number) => {
    if (score >= 60) return "#ef4444";
    if (score >= 45) return "#f97316";
    if (score >= 35) return "#eab308";
    return "#22c55e";
  };

  return (
    <>
      <div
        className={`relative overflow-hidden ${embedded ? "p-0" : "p-2 rounded-xl wsource-card--ghost"} ${
          isDark ? "text-white" : "text-slate-900"
        }`}
        style={{ background: embedded ? "transparent" : "var(--bs-body-bg, #f8fafc)" }}
      >
        {!embedded && <div className="flex items-center justify-center gap-4 mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-center">Források átlagos clickbait pontszáma</h2>
          <button onClick={() => setOpenInfo(true)} aria-label="Információ" type="button" className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0">
            <img src="/icons/info-svg.svg" alt="info" className="w-[26px] h-[26px] object-contain pointer-events-none" />
          </button>
        </div>}

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
        <div className="relative z-10" style={{ height: Math.min(260, Math.max(150, sources.length * 34 + 64)) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={isDark ? "dark" : "light"}
              layout="vertical"
              data={sources}
              margin={{ top: 6, right: 38, left: 4, bottom: 6 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke={isDark ? "#cbd5e1" : "#475569"}
                tick={{ fill: isDark ? "#e2e8f0" : "#334155" }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={100}
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
                formatter={(value?: number, _name, item) => [`${(value ?? 0).toFixed(1)} / 100 · ${item?.payload?.articles ?? 0} cikk`, "Clickbait pontszám"]}
              />

              <Bar dataKey="score" barSize={18} radius={[0, 8, 8, 0]} animationDuration={500}>
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

      {!embedded && <UtomModal
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
      </UtomModal>}
    </>
  );
}
