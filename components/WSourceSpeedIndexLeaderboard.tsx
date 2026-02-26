"use client";

import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";

// --- API fetcher (kötelező) ---
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

  // --- Dark mode detektálás (kötelező mintád alapján) ---
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // --- API hívás ---
  const { data, error, isLoading } = useSWR<{
    success: boolean;
    leaderboard: LeaderboardItem[];
  }>("/api/insights/speedindex/leaderboard", fetcher, {
    refreshInterval: 60000,
  });

  // --- Betöltés ---
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  // --- Hiba ---
  if (error || !data?.success) {
    return (
      <div className="p-4 text-red-500">
        Nem sikerült betölteni a Speed Index adatokat.
      </div>
    );
  }

  const items = data.leaderboard;

  return (
    <div
      className={`p-4 rounded border ${
        isDark
          ? "border-[#1e293b] text-white"
          : "border-[#e5e7eb] text-black"
      }`}
      style={{
        backgroundColor: "var(--bs-body-bg)",
      }}
    >
      <h3 className="text-lg font-semibold mb-4 text-center">
        Speed Index rangsor (átlagos késés per hír)
      </h3>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.source}
            className={`p-3 rounded border flex justify-between items-center ${
              isDark
                ? "border-[#1e293b] text-white"
                : "border-[#e5e7eb] text-black"
            }`}
            style={{
              backgroundColor: "var(--bs-body-bg)",
            }}
          >
            <div className="font-semibold">{item.source}</div>

            <div className="text-sm opacity-80">
              Átlag:{" "}
              <span className="font-bold">
                {item.avgDelay.toFixed(1)} perc
              </span>{" "}
              | Medián:{" "}
              <span className="font-bold">
                {item.medianDelay.toFixed(1)} perc
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
