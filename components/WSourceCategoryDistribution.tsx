"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import { useState } from "react";
import UtomModal from "@/components/UtomModal";

ChartJS.register(ArcElement, Tooltip, Legend);

// SAJÁT LABEL-RAJZOLÓ PLUGIN
const sliceLabelPlugin = {
  id: "sliceLabelPlugin",
  afterDraw(chart: any) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc: any, index: number) => {
      const value = dataset.data[index];
      if (!value) return;

      const pos = arc.tooltipPosition();
      ctx.fillStyle = "#000";
      ctx.fillText(value, pos.x, pos.y);
    });

    ctx.restore();
  },
};

interface CategoryItem {
  source: string;
  Politika: number;
  Gazdaság: number;
  Közélet: number;
  Kultúra: number;
  Sport: number;
  Tech: number;
  Egészségügy: number;
  Oktatás: number;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceCategoryDistribution() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{ success: boolean; items: CategoryItem[] }>(
    "/api/insights/source-category-distribution",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data?.success) {
    return <div className="p-4 text-red-500">Nem sikerült betölteni az adatokat.</div>;
  }

  const items = data.items.filter(i => i.source.toLowerCase() !== "portfolio");

  const categories = [
    "Politika",
    "Gazdaság",
    "Közélet",
    "Kultúra",
    "Sport",
    "Tech",
    "Egészségügy",
    "Oktatás",
  ];

  const categoryColors = [
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#6366f1",
  ];

  return (
    <>
      <div
        className={`p-4 rounded border ${
          isDark ? "border-[#1e293b] text-white" : "border-[#e5e7eb] text-black"
        } wsource-card--ghost`}
        style={{
          backgroundColor: "var(--bs-body-bg)",
          borderColor: "transparent",
          boxShadow: "none",
        }}
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-center">
            Kategóriaeloszlás forrásonként
          </h3>

          <button
            onClick={() => setOpenInfo(true)}
            aria-label="Információ"
            type="button"
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img
              src="/icons/info-svg.svg"
              alt="info"
              className="w-[26px] h-[26px] object-contain pointer-events-none"
            />
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 justify-center pl-4">
          {items.map((src) => {
            const values = categories.map((c) => (src as any)[c] ?? 0);

            const chartData = {
              labels: categories,
              datasets: [
                {
                  data: values,
                  backgroundColor: categoryColors,
                  borderWidth: 0,
                },
              ],
            };

            const options = {
              cutout: "70%",
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) => {
                      const value = ctx.raw;
                      return value > 0 ? `${ctx.label}: ${value}` : "";
                    },
                  },
                },
              },
            };

            return (
              <div
                key={src.source}
                className={`min-w-[150px] p-2 rounded border flex flex-col items-center ${
                  isDark ? "border-[#1e293b] text-white" : "border-[#e5e7eb] text-black"
                } wsource-card--ghost`}
                style={{
                  backgroundColor: "var(--bs-body-bg)",
                  borderColor: "transparent",
                  boxShadow: "none",
                }}
              >
                <h4 className="text-xs font-semibold mb-1 text-center">
                  {src.source}
                </h4>

                <div
                  className="relative w-[120px] h-[120px]"
                  style={{
                    backgroundColor: "var(--bs-body-bg)",
                    borderColor: "transparent",
                  }}
                >
                  <Doughnut data={chartData} options={options} plugins={[sliceLabelPlugin]} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🔥 ÚJ, FELTUNINGOLT UTOM MODAL */}
      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mit mutat ez a grafikon?"
      >
        <div className="text-sm leading-relaxed space-y-6">

          {/* Belső cím */}
          <h3 className="text-xl font-bold text-center mb-2">
            Mit jelent a kategóriaeloszlás?
          </h3>

          {/* Bevezető */}
          <p className="text-base font-semibold text-center">
            Ez a grafikon azt mutatja meg, hogy egy hírforrás
            <span style={{ color: "#3b82f6" }}> <b>milyen témákra fókuszál</b></span>
            a mai napon.
          </p>

          {/* Ikonos magyarázat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">🗂️</div>
              <p>
                Minden cikk egy kategóriába kerül: politika, gazdaság, sport, tech stb.
                A rendszer megszámolja, hogy egy forrás hány cikket publikált az egyes témákban.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📊</div>
              <p>
                A kördiagram azt mutatja, hogy a forrás tartalmának
                <b> mekkora része</b> tartozik az egyes kategóriákba.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">🔍</div>
              <p>
                Ez segít megérteni, hogy egy forrás inkább
                <b>politikai fókuszú</b>, <b>gazdasági orientációjú</b>,
                vagy éppen <b>szórakoztató jellegű</b>.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📅</div>
              <p>
                A mutató <b>napi bontású</b>, így jól látható, ha egy forrás
                tematikája egyik napról a másikra megváltozik.
              </p>
            </div>

          </div>

          {/* Kiemelt doboz */}
          <div
            className="p-4 rounded-xl text-center"
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <p className="font-semibold mb-2 text-lg">Mit jelent ez a gyakorlatban?</p>

            <ul className="list-disc list-inside space-y-1 text-left inline-block text-sm">
              <li><b>Sok piros (politika)</b> → erős politikai fókusz.</li>
              <li><b>Sok sárga (gazdaság)</b> → gazdasági orientáció.</li>
              <li><b>Sok kék/lila</b> → tech, kultúra, sport dominancia.</li>
              <li>A mutató <i>nem minőségi értékelés</i>, csak a témák arányát mutatja.</li>
            </ul>
          </div>

          {/* Lezárás */}
          <p className="text-center">
            A kategóriaeloszlás segít megérteni, hogy egy forrás milyen témákra
            helyezi a hangsúlyt, és hogyan változik a tartalmi profilja naponta.
          </p>

          <p
            className="text-xs italic text-center mt-6"
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            A kategóriaeloszlás AI által került meghatározásra.
          </p>

        </div>
      </UtomModal>
    </>
  );
}
