"use client";

import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceClickbaitPro() {
  const theme = useUserStore((s) => s.theme);

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

  const sources = data.sources || [];

  const getColor = (score: number) =>
    score >= 60 ? "text-red-500" :
    score >= 40 ? "text-yellow-500" :
    "text-blue-400";

  const getIcon = (score: number) =>
    score >= 60 ? "🔥" :
    score >= 40 ? "⚠️" :
    "🧊";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {sources.map((src: any) => {
        const score = Number(src.avg_clickbait);

        const trend = [
          { value: score - 5 },
          { value: score - 2 },
          { value: score + 3 },
          { value: score - 1 },
          { value: score + 2 },
        ];

        return (
          <div
            key={src.source}
            className={`
              p-6 rounded-2xl border shadow-lg backdrop-blur-md 
              transition-all hover:scale-[1.03] hover:shadow-2xl
              ${isDark 
                ? "bg-[#0f172a]/70 border-gray-700 text-gray-200" 
                : "bg-white/80 border-gray-200 text-gray-800"
              }
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 ${getColor(score)}`}>
                <span className="text-2xl">{getIcon(score)}</span>
                <span className="font-semibold text-xl">{src.source}</span>
              </div>
              <span className="font-bold text-2xl">{score.toFixed(1)}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-700/30 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Sparkline */}
            <div className="w-full h-14">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
