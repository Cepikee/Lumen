"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useUserStore } from "@/store/useUserStore";
import { useState } from "react";
import UtomModal from "@/components/UtomModal";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const fetcher = (url: string) =>
  fetch(url, {
    headers: { "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY! },
  }).then((r) => r.json());

export default function WSentimentToday() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/sentiment/today",
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) return <div className="p-12 text-center">Betöltés...</div>;
  if (error || !data?.success)
    return (
      <div className="p-12 text-center text-red-500">
        Hiba az adatok betöltésekor
      </div>
    );

  const series = [
    data.positive || 0,
    data.neutral || 0,
    data.negative || 0,
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "pie",
      background: "transparent",
      foreColor: isDark ? "#fff" : "#000",
      toolbar: { show: false },
      animations: { enabled: true },
      zoom: { enabled: false },
    },

    theme: { mode: isDark ? "dark" : "light" },

    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: { labels: { show: false } },
      },
    },

    states: {
      hover: { filter: { type: "none" } },
      active: { filter: { type: "none" } },
    },

    grid: {
      borderColor: isDark ? "#334155" : "#e2e8f0",
      strokeDashArray: 3,
    },

    tooltip: {
      theme: isDark ? "dark" : "light",
      fillSeriesColor: false,
      marker: { show: false },
    },

    legend: {
      position: "bottom",
      labels: { colors: isDark ? "#fff" : "#000" },
      onItemHover: { highlightDataSeries: false },
    },

    labels: ["Pozitív", "Semleges", "Negatív"],
    colors: ["#22c55e", "#94a3b8", "#ef4444"],

    dataLabels: {
      enabled: true,
      formatter: (val) => {
        const num = Number(val);
        return isNaN(num) ? "0%" : `${num.toFixed(1)}%`;
      },
    },
  };

  return (
    <>
      <div
        className="relative z-10 p-12 rounded-3xl wsource-card--ghost"
        style={{ background: "var(--bs-body-bg)" }}
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Napi hangulatmegoszlás
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img src="/icons/info-svg.svg" alt="info" width={26} height={26} />
          </button>
        </div>

        <div className="min-h-[340px]">
          <Chart options={options} series={series} type="pie" height={380} />
        </div>
      </div>

      {/* 🔥 ÚJ, FELTUNINGOLT UTOM MODAL */}
      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mi az a hangulatelemzés?"
      >
        <div className="text-sm leading-relaxed space-y-6">

          {/* Belső cím */}
          <h3 className="text-xl font-bold text-center mb-2">
            Hogyan működik a napi hangulatelemzés?
          </h3>

          {/* Bevezető */}
          <p className="text-base font-semibold text-center">
            A rendszer minden hírt <b>pozitív</b>, <b>semleges</b> vagy <b>negatív</b> hangulatúnak
            osztályoz, és ezekből számolja ki a mai nap összesített arányait.
          </p>

          {/* Ikonos magyarázat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">🧠</div>
              <p>
                A cikkek szövegét egy AI‑modell elemzi, és meghatározza,
                milyen érzelmi töltet jellemzi a tartalmat.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📊</div>
              <p>
                A grafikon azt mutatja, hogy a mai hírek mekkora része volt
                <b>pozitív</b>, <b>semleges</b> vagy <b>negatív</b>.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📅</div>
              <p>
                A mutató <b>napi bontású</b>, így jól látható, ha egy nap
                különösen negatív vagy pozitív hangulatú hírek dominálnak.
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
              <li><b>Sok zöld</b> → pozitív hangulatú nap.</li>
              <li><b>Sok szürke</b> → semleges, kiegyensúlyozott hírek.</li>
              <li><b>Sok piros</b> → negatív hangulatú nap.</li>
              <li>A mutató <i>nem minőségi értékelés</i>, csak a hangulat arányát mutatja.</li>
            </ul>
          </div>

          {/* Lezárás */}
          <p className="text-center">
            A hangulatelemzés segít megérteni, milyen érzelmi tónus jellemzi
            a mai híreket, és hogyan változik a közbeszéd hangulata.
          </p>

          <p
            className="text-xs italic text-center mt-6"
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            A hangulatelemzés AI által került meghatározásra.
          </p>

        </div>
      </UtomModal>
    </>
  );
}
