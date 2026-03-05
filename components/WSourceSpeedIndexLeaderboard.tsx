"use client";

import useSWR from "swr";
import { useMemo, useRef, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { motion, AnimatePresence } from "framer-motion";
import UtomModal from "@/components/UtomModal";

interface LeaderboardItem {
  source: string;
  avgDelay: number | null;
  medianDelay: number | null;
  updatedAt: string;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: { "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY! },
  }).then((r) => r.json());

export default function WSourceSpeedIndexLeaderboard() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

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
      (a, b) => (a.avgDelay ?? Infinity) - (b.avgDelay ?? Infinity)
    );
  }, [data]);

  if (isLoading) return <div className="p-12 text-center">Betöltés...</div>;
  if (error || !data?.success)
    return <div className="p-12 text-center text-red-500">Hiba az adatok betöltésekor</div>;

  const maxDelay = Math.max(...items.map((i) => i.avgDelay ?? 0), 0);

  const toDisplayMinutes = (v: number | null | undefined) => {
    if (v == null || !isFinite(v)) return "—";
    if (v > 1000) return "—";
    return v.toFixed(1) + " perc";
  };

  return (
    <>
      <div
        className={`relative p-10 rounded-3xl overflow-hidden wsource-card--ghost ${
          isDark ? "text-white" : "text-slate-900"
        }`}
        style={{ background: "var(--bs-body-bg, #f8fafc)" }}
      >
        {/* háttér glow-ok */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: isDark
              ? "rgba(79,70,229,0.10)"
              : "rgba(0,0,0,0.03)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: isDark
              ? "rgba(147,51,234,0.10)"
              : "rgba(0,0,0,0.03)",
          }}
        />

        {/* header */}
        <div className="flex items-center justify-center gap-4 mb-6 relative z-10">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Speed Index
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img src="/icons/info-svg.svg" alt="info" width={26} height={26} />
          </button>
        </div>

        {/* lista */}
        <div className="space-y-6 relative z-10">
          {items.map((item, index) => {
            const previousIndex = previousRanking.current[item.source] ?? index;
            const delta = previousIndex - index;
            previousRanking.current[item.source] = index;

            const percentage = maxDelay
              ? ((item.avgDelay ?? 0) / maxDelay) * 100
              : 0;

            return (
              <motion.div
                key={item.source}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                } shadow-lg hover:shadow-2xl`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-lg font-semibold w-8 shrink-0">
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="text-lg font-medium truncate">
                        {item.source}
                      </div>
                      <div className="text-xs opacity-50">
                        Medián: {toDisplayMinutes(item.medianDelay)}
                      </div>
                    </div>

                    <AnimatePresence>
                      {delta !== 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            delta > 0
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-xl font-bold w-24 text-right">
                      {toDisplayMinutes(item.avgDelay)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* INFO MODAL */}
          <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mi az a Speed Index?"
      >
        <div className="text-sm leading-relaxed space-y-4">

          <p className="text-base font-semibold">
            A <b>Speed Index</b> azt mutatja meg, hogy egy hírforrás <span style={{color:"#22c55e"}}><b>milyen gyorsan reagál</b></span> a friss eseményekre.
          </p>

          <p>
            Amikor egy új téma felbukkan a hírekben, mindig van egy forrás, amelyik <b>elsőként</b> ír róla.
            Ehhez az első megjelenéshez viszonyítjuk, hogy a többi forrás <b>hány perccel később</b> publikálja
            ugyanennek a témának a saját változatát.
          </p>

          <p>
            Ha egy forrás rendszeresen gyorsan reagál, akkor <b style={{color:"#16a34a"}}>alacsony késési értéket</b> kap.
            Ha gyakran csak jóval később jelenik meg ugyanazzal a témával, akkor a késés
            <b style={{color:"#dc2626"}}> magasabb</b> lesz.
          </p>

          <p>
            A rangsor úgy áll össze, hogy megnézzük: egy forrás átlagosan mennyivel marad le az első
            megjelenéshez képest. Az kerül előrébb, aki a legtöbb témánál a <b>legkisebb késéssel</b> jelenik meg.
          </p>

          <div className="p-4 rounded-xl"
              style={{background:"rgba(0,0,0,0.05)", border:"1px solid rgba(0,0,0,0.1)"}}>
            <p className="font-semibold mb-2">Mit jelent ez a gyakorlatban?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>A <b>kisebb érték</b> gyorsabb reakciót jelent.</li>
              <li>A <b>nagyobb érték</b> lassabb megjelenést jelez.</li>
              <li>A helyezések folyamatosan változhatnak, ahogy új témák jelennek meg.</li>
              <li>A Speed Index <i>nem minőségi mutató</i>, csak az időzítést méri.</li>
            </ul>
          </div>

          <p>
            A Speed Index célja, hogy átláthatóvá tegye, mely források követik a leggyorsabban az eseményeket,
            és kik azok, akik inkább később csatlakoznak egy-egy témához.
          </p>

          <p className="text-xs opacity-70 italic">
            A rangsor AI által került meghatározásra.
          </p>

        </div>
      </UtomModal>

    </>
  );
}
