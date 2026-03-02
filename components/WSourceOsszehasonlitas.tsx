"use client";

import { useUserStore } from "@/store/useUserStore";

// Gyerek komponensek
import WSourceCategoryDistribution from "./WSourceCategoryDistribution";
import WSourceClickbait from "./WSourceClickbait";
import WSourceClickbaitRatio from "./WSourceClickbaitRatio";
import WSourceSpeedIndexLeaderboard from "./WSourceSpeedIndexLeaderboard";
import WSourceDuplication from "./WSourceDuplication";

export default function WSourceOsszehasonlitas() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* --- 1) Kategóriaeloszlás --- */}
      <div
        className="p-4 rounded border bg-[var(--bs-body-bg)]"
        style={{
          borderColor: isDark ? "#1e293b" : "#e5e7eb",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <WSourceCategoryDistribution />
      </div>

      {/* --- 2) CLICKBAIT INDEX --- */}
      <div
        className="p-4 rounded border bg-[var(--bs-body-bg)]"
        style={{
          borderColor: isDark ? "#1e293b" : "#e5e7eb",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <div className="relative z-10 mb-8 mt-2">
          <h2
            className="text-3xl font-bold tracking-tight text-center"
            style={{ color: isDark ? "#fff" : "#000" }}
          >
            Források Clickbait Indexei
          </h2>
        </div>

        <WSourceClickbait />
      </div>

      {/* --- 3) CLICKBAIT ARÁNY --- */}
      <div
        className="p-4 rounded border bg-[var(--bs-body-bg)]"
        style={{
          borderColor: isDark ? "#1e293b" : "#e5e7eb",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <div className="relative z-10 mb-8 mt-2">
          <h2
            className="text-3xl font-bold tracking-tight text-center"
            style={{ color: isDark ? "#fff" : "#000" }}
          >
            Források Clickbait Arányai
          </h2>
        </div>

        <WSourceClickbaitRatio />
      </div>

      {/* --- 4) SPEED INDEX BLOKK --- */}
      <div
        className="p-4 rounded border bg-[var(--bs-body-bg)]"
        style={{
          borderColor: isDark ? "#1e293b" : "#e5e7eb",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">
          Speed Index elemzések
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-3 rounded border"
            style={{
              borderColor: isDark ? "#334155" : "#d1d5db",
              backgroundColor: "var(--bs-body-bg)",
            }}
          >
            <WSourceSpeedIndexLeaderboard />
          </div>
        </div>
      </div>
            {/* --- 5) DUPLICATION SCORE BLOKK --- */}
      <div
        className="p-4 rounded border bg-[var(--bs-body-bg)]"
        style={{
          borderColor: isDark ? "#1e293b" : "#e5e7eb",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">
          Másolási arány 
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-3 rounded border"
            style={{
              borderColor: isDark ? "#334155" : "#d1d5db",
              backgroundColor: "var(--bs-body-bg)",
            }}
          >
            <WSourceDuplication />
          </div>
        </div>
      </div>

    </div>
  );
}
