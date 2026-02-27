"use client";

import { useState } from "react";
import { useUserStore } from "@/store/useUserStore";

// Gyerek komponensek
import WSourceCategoryDistribution from "./WSourceCategoryDistribution";
import WSourceClickbait from "./WSourceClickbait";
import WSourceClickbaitRatio from "./WSourceClickbaitRatio";
import WSourceSpeedIndexLeaderboard from "./WSourceSpeedIndexLeaderboard";
import WSourceSpeedIndexDistribution from "./WSourceSpeedIndexDistribution";
import WSourceSpeedIndexTimeline from "./WSourceSpeedIndexTimeline";

import { motion, AnimatePresence } from "framer-motion";

export default function WSourceOsszehasonlitas() {
  const theme = useUserStore((s) => s.theme);
  const [showInfo, setShowInfo] = useState(false);

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
              {/* --- 1) Speed Index rangsor --- */}
              <div
                className="p-3 rounded border"
                style={{
                  borderColor: isDark ? "#334155" : "#d1d5db",
                  backgroundColor: "var(--bs-body-bg)",
                }}
              >
                <div className="flex justify-center items-center gap-2 mb-4">
                  <h4 className="text-md font-semibold text-center">
                    Speed Index magyarázat
                  </h4>

                  <button
                    onClick={() => setShowInfo(true)}
                    className="text-slate-400 hover:text-slate-200 text-lg"
                  >
                    ⓘ
                  </button>
                </div>

                <WSourceSpeedIndexLeaderboard />

                <AnimatePresence>
                  {showInfo && (
                    <SpeedIndexInfoModal onClose={() => setShowInfo(false)} />
                  )}
                </AnimatePresence>
              </div>

              {/* --- 2) Speed Index eloszlás --- */}
              <div
                className="p-3 rounded border"
                style={{
                  borderColor: isDark ? "#334155" : "#d1d5db",
                  backgroundColor: "var(--bs-body-bg)",
                }}
              >
                <h4 className="text-md font-semibold mb-2 text-center">
                  Késés-eloszlás
                </h4>
                <WSourceSpeedIndexDistribution source="telex.hu" />
              </div>

              {/* --- 3) Speed Index timeline --- */}
              <div
                className="p-3 rounded border"
                style={{
                  borderColor: isDark ? "#334155" : "#d1d5db",
                  backgroundColor: "var(--bs-body-bg)",
                }}
              >
                <h4 className="text-md font-semibold mb-2 text-center">
                  Hír terjedése
                </h4>
                <WSourceSpeedIndexTimeline clusterId={1} />
              </div>
            </div>
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
            <h3 className="text-lg font-semibold mb-2">
              Kategória összehasonlítás
            </h3>
            <p className="text-sm opacity-70">
              Ide jön majd a két forrás radar chartja egymás mellett.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= */
/* Speed Index Magyarázó Modal */
/* ============================= */

function SpeedIndexInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-[#0f172a] text-white p-8 rounded-2xl max-w-lg w-full border border-white/10 shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-4">Mi az a Speed Index?</h2>

        <div className="space-y-4 text-sm opacity-90 leading-relaxed">
          <p>
            A Speed Index azt mutatja meg, hogy egy hírportál mennyivel később
            ír ugyanarról a témáról, mint a legelső megjelenés.
          </p>

          <p>
            Ha egy portál 0 percet mutat, akkor gyakran elsőként ír. Ha 100+
            percet mutat, akkor sok témában később reagál.
          </p>

          <p>
            Csak azok a portálok jelennek meg, amelyek ugyanarról a témáról
            írnak más portálokkal együtt, és van időkülönbség a cikkek között.
          </p>

          <p>
            A medián 0 azt jelenti, hogy sokszor ők is elsők, de amikor késnek,
            akkor nagyot.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          Bezárás
        </button>
      </motion.div>
    </motion.div>
  );
}
