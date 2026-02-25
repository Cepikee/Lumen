"use client";

import { useState } from "react";
import { useUserStore } from "@/store/useUserStore";

// Gyerek komponensek
import WSourceCategoryDistribution from "./WSourceCategoryDistribution";
import WSourceClickbait from "./WSourceClickbait";
import WSourceClickbaitRatio from "./WSourceClickbaitRatio";

export default function WSourceOsszehasonlitas() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const [view, setView] = useState<"stats" | "compare">("stats");

  const [sourceA, setSourceA] = useState<string | null>(null);
  const [sourceB, setSourceB] = useState<string | null>(null);

  return (
    <div className="w-full flex flex-col gap-6">

      {/* --- OLDAL CÍM --- */}
      <h2
        className="text-2xl font-bold"
        style={{ color: isDark ? "#fff" : "#000" }}
      >
        Forrás-összehasonlítás
      </h2>

      {/* --- NÉZETVÁLTÓ --- */}
      <div className="flex gap-3">
        <button
          onClick={() => setView("stats")}
          className={`px-4 py-2 rounded ${
            view === "stats"
              ? "bg-blue-600 text-white"
              : isDark
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Statisztika
        </button>

        <button
          onClick={() => setView("compare")}
          className={`px-4 py-2 rounded ${
            view === "compare"
              ? "bg-blue-600 text-white"
              : isDark
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Összehasonlítás
        </button>
      </div>

      {/* --- STATISZTIKAI NÉZET --- */}
      {view === "stats" && (
        <div className="flex flex-col gap-6">

          {/* --- 1) Kategóriaeloszlás --- */}
          <div
            className="p-4 rounded border bg-[var(--bs-body-bg)]"
            style={{
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <h3 className="text-lg font-semibold mb-4">
              Kategóriaeloszlás forrásonként
            </h3>

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
            {/* A cím pontosan úgy, mint a gyerek komponensben volt */}
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

          {/* --- 3) Clickbait arány placeholder --- */}
          <div
            className="p-4 rounded border bg-[var(--bs-body-bg)]"
            style={{
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            {/* A cím pontosan úgy, mint a gyerek komponensben volt */}
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

          {/* --- 4) Speed index placeholder --- */}
          <div
            className="p-4 rounded border bg-[var(--bs-body-bg)]"
            style={{
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <h3 className="text-lg font-semibold mb-2">Sebesség index</h3>
            <p className="text-sm opacity-70">Ide jön majd a speed chart.</p>
          </div>
        </div>
      )}

      {/* --- ÖSSZEHASONLÍTÓ NÉZET --- */}
      {view === "compare" && (
        <div className="flex flex-col gap-6">

          {/* --- FORRÁSVÁLASZTÓ --- */}
          <div
            className="p-4 rounded border flex flex-col gap-4 bg-[var(--bs-body-bg)]"
            style={{
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <h3 className="text-lg font-semibold">Válassz két forrást</h3>

            <div className="flex gap-4">
              <select
                className="p-2 rounded border bg-transparent"
                style={{
                  borderColor: isDark ? "#334155" : "#d1d5db",
                  color: isDark ? "#fff" : "#000",
                }}
                value={sourceA ?? ""}
                onChange={(e) => setSourceA(e.target.value)}
              >
                <option value="">Forrás A</option>
                <option value="index.hu">index.hu</option>
                <option value="telex.hu">telex.hu</option>
                <option value="origo.hu">origo.hu</option>
                <option value="24.hu">24.hu</option>
                <option value="hvg.hu">hvg.hu</option>
              </select>

              <select
                className="p-2 rounded border bg-transparent"
                style={{
                  borderColor: isDark ? "#334155" : "#d1d5db",
                  color: isDark ? "#fff" : "#000",
                }}
                value={sourceB ?? ""}
                onChange={(e) => setSourceB(e.target.value)}
              >
                <option value="">Forrás B</option>
                <option value="index.hu">index.hu</option>
                <option value="telex.hu">telex.hu</option>
                <option value="origo.hu">origo.hu</option>
                <option value="24.hu">24.hu</option>
                <option value="hvg.hu">hvg.hu</option>
              </select>
            </div>
          </div>

          {/* --- ÖSSZEHASONLÍTÓ CHARTOK HELYE --- */}
          <div
            className="p-4 rounded border bg-[var(--bs-body-bg)]"
            style={{
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <h3 className="text-lg font-semibold mb-2">Kategória összehasonlítás</h3>
            <p className="text-sm opacity-70">
              Ide jön majd a két forrás radar chartja egymás mellett.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
