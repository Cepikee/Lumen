"use client";

import { useState } from "react";
import { useUserStore } from "@/store/useUserStore";

// --- Gyerek komponens: kategóriaeloszlás ---
import WSourceCategoryDistribution from "./WSourceCategoryDistribution";

export default function WSourceOsszehasonlitas() {
  // --- THEME (pont úgy, ahogy te használod) ---
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // --- NÉZET: statisztika / összehasonlítás ---
  const [view, setView] = useState<"stats" | "compare">("stats");

  // --- ÖSSZEHASONLÍTÁS: két forrás kiválasztása ---
  const [sourceA, setSourceA] = useState<string | null>(null);
  const [sourceB, setSourceB] = useState<string | null>(null);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* --- CÍM --- */}
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

          {/* --- 1) Kategóriaeloszlás forrásonként --- */}
          <WSourceCategoryDistribution />

          {/* --- További modulok majd ide jönnek --- */}
          <div
            className="p-4 rounded border"
            style={{
              background: isDark ? "#0b1220" : "#fff",
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <h3 className="text-lg font-semibold mb-2">Clickbait arány</h3>
            <p className="text-sm opacity-70">Ide jön majd a bar chart.</p>
          </div>

          <div
            className="p-4 rounded border"
            style={{
              background: isDark ? "#0b1220" : "#fff",
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
            className="p-4 rounded border flex flex-col gap-4"
            style={{
              background: isDark ? "#0b1220" : "#fff",
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
            className="p-4 rounded border"
            style={{
              background: isDark ? "#0b1220" : "#fff",
              borderColor: isDark ? "#1e293b" : "#e5e7eb",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <h3 className="text-lg font-semibold mb-2">Kategória összehasonlítás</h3>
            <p className="text-sm opacity-70">Ide jön majd a két forrás radar chartja egymás mellett.</p>
          </div>
        </div>
      )}
    </div>
  );
}
