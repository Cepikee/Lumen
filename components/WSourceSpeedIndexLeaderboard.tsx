"use client";

import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

interface LeaderboardItem {
  source: string;
  avgDelay: number;
  medianDelay: number;
  updatedAt: string;
}

export default function WSourceSpeedIndexLeaderboard() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    leaderboard: LeaderboardItem[];
  }>("/api/insights/speedindex/leaderboard", fetcher, {
    refreshInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm opacity-70">
        Betöltés…
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-4 text-red-500 text-sm">
        Nem sikerült betölteni a Speed Index adatokat.
      </div>
    );
  }

  const items = data.leaderboard;

  return (
    <div
      className={`p-6 rounded-xl shadow-sm border ${
        isDark
          ? "border-[#1e293b] bg-[#0f172a] text-white"
          : "border-gray-200 bg-white text-black"
      }`}
    >
      <h3 className="text-xl font-bold mb-5 text-center">
        Speed Index rangsor
      </h3>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const delayColor =
            item.avgDelay <= 1
              ? "text-green-500"
              : item.avgDelay <= 5
              ? "text-yellow-500"
              : "text-red-500";

          return (
            <div
              key={item.source}
              className={`p-4 rounded-lg border flex justify-between items-center transition ${
                isDark
                  ? "border-[#1e293b] bg-[#1e293b]/40"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="font-semibold text-lg">{item.source}</div>

              <div className="text-sm text-right">
                <div className={`${delayColor} font-bold`}>
                  {item.avgDelay.toFixed(1)} perc átlag
                </div>
                <div className="opacity-70">
                  Medián: {item.medianDelay.toFixed(1)} perc
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
