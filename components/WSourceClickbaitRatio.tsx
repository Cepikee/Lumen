"use client";

import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
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
    <div
      className="relative p-10 rounded-3xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden bg-[var(--bs-body-bg)]"
    >
      {/* subtle background glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl"
        style={{
          backgroundColor: isDark
            ? "rgba(79,70,229,0.10)"
            : "rgba(0,0,0,0.03)",
        }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl"
        style={{
          backgroundColor: isDark
            ? "rgba(147,51,234,0.10)"
            : "rgba(0,0,0,0.03)",
        }}
      />

      {/* MAIN CHART */}
      <div className="relative z-10 h-[440px]">
        <ResponsiveContainer
          width="100%"
          height="100%"
          className="bg-[var(--bs-body-bg)]"
        >
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

            <Tooltip
              cursor={{
                fill: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              }}
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
  );
}
