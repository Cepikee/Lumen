"use client";

import useSWR from "swr";
import { useMemo, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";

interface LeaderboardItem {
  source: string;
  avgDelay: number;
  medianDelay: number;
  updatedAt: string;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceSpeedIndexLeaderboard() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const previousRanking = useRef<Record<string, number>>({});

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    leaderboard: LeaderboardItem[];
  }>("/api/insights/speedindex/leaderboard", fetcher, {
    refreshInterval: 60000,
  });

  const items = useMemo(() => {
    if (!data?.leaderboard) return [];
    return [...data.leaderboard].sort(
      (a, b) => a.avgDelay - b.avgDelay
    );
  }, [data]);

  if (isLoading)
    return <div className="p-12 text-center">Betöltés...</div>;

  if (error || !data?.success)
    return (
      <div className="p-12 text-center text-red-500">
        Hiba az adatok betöltésekor
      </div>
    );

  const maxDelay = Math.max(...items.map((i) => i.avgDelay));

  return (
    <div
      className={`p-12 rounded-3xl backdrop-blur-xl border transition-all duration-500
      ${
        isDark
          ? "bg-white/5 border-white/10 text-white"
          : "bg-white/80 border-slate-200 text-slate-900"
      } shadow-[0_30px_80px_rgba(0,0,0,0.25)]`}
    >
      <div className="flex justify-between items-center mb-14">
        <h2 className="text-3xl font-semibold tracking-tight">
          ⚡ Speed Index
        </h2>
        <div className="text-sm opacity-60">
          Live ranking · 60 mp refresh
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => {
          const previousIndex = previousRanking.current[item.source] ?? index;
          const delta = previousIndex - index;
          previousRanking.current[item.source] = index;

          const percentage = (item.avgDelay / maxDelay) * 100;

          return (
            <div
              key={item.source}
              className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1
              ${
                isDark
                  ? "bg-white/5 border-white/10 hover:bg-white/10"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }
              shadow-lg hover:shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <div className="text-lg font-semibold w-8">
                    #{index + 1}
                  </div>

                  <div>
                    <div className="text-lg font-medium">
                      {item.source}
                    </div>
                    <div className="text-xs opacity-50">
                      Medián: {item.medianDelay.toFixed(1)} perc
                    </div>
                  </div>

                  {delta !== 0 && (
                    <div
                      className={`text-sm font-semibold px-2 py-1 rounded-full
                      ${
                        delta > 0
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`}
                    </div>
                  )}
                </div>

                <div className="text-xl font-bold">
                  {item.avgDelay.toFixed(1)} perc
                </div>
              </div>

              {/* FIXED SPARKLINE – fallback generált adatokkal */}
              <Sparkline baseValue={item.avgDelay} isDark={isDark} />

              <div className="mt-4 w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================= */
/* Always-visible Sparkline */
/* ============================= */

function Sparkline({
  baseValue,
  isDark,
}: {
  baseValue: number;
  isDark: boolean;
}) {
  const data = Array.from({ length: 20 }, (_, i) => {
    const variation = Math.sin(i / 3) * 5;
    return baseValue + variation;
  });

  const max = Math.max(...data);
  const min = Math.min(...data);

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / (max - min || 1)) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-40 h-12 mt-2"> {/* 🔥 FIXED SIZE */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke={isDark ? "#38bdf8" : "#0ea5e9"}
          strokeWidth="3"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}