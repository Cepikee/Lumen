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

export default function WSentimentTimeline() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/sentiment/timeline",
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

  const hours = data.timeline.map((t: any) => `${t.hour}:00`);
  const positive = data.timeline.map((t: any) => t.positive);
  const negative = data.timeline.map((t: any) => t.negative);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      background: "transparent", // 🔥 nincs apex háttér
      foreColor: isDark ? "#fff" : "#000",
      toolbar: { show: false },
      animations: { enabled: true },
      zoom: { enabled: false },
    },

    theme: { mode: isDark ? "dark" : "light" },

    stroke: { curve: "smooth", width: 3 },

    xaxis: {
      categories: hours,
      labels: {
        style: { colors: isDark ? "#e2e8f0" : "#334155", fontWeight: 600 },
      },
    },

    colors: ["#22c55e", "#ef4444"],

    dataLabels: { enabled: false },

    states: {
      hover: { filter: { type: "none" } }, // 🔥 nincs hover highlight
      active: { filter: { type: "none" } },
    },

    grid: {
      borderColor: isDark ? "#334155" : "#e2e8f0",
      strokeDashArray: 3, // 🔥 nincs világos csík hoverkor
    },

    tooltip: {
      theme: isDark ? "dark" : "light",
      fillSeriesColor: false,
      marker: { show: false },
    },

    legend: {
      labels: { colors: isDark ? "#fff" : "#000" },
      onItemHover: { highlightDataSeries: false }, // 🔥 nincs legend hover highlight
    },
  };

  const series = [
    { name: "Pozitív", data: positive },
    { name: "Negatív", data: negative },
  ];

  return (
    <>
      <div
        className="relative z-10 p-12 rounded-3xl wsource-card--ghost"
        style={{ background: "var(--bs-body-bg)" }} // 🔥 UTOM háttér
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Hangulat időbeli alakulása (óra)
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img src="/icons/info-svg.svg" alt="info" width={26} height={26} />
          </button>
        </div>

        <div className="min-h-[340px]">
          <Chart options={options} series={series} type="line" height={420} />
        </div>
      </div>

      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mit mutat ez a grafikon?"
      >
        <div className="text-sm leading-relaxed">
          <p>
            Óránként mutatja, hogy mennyi pozitív és negatív hangulatú cikk
            jelent meg.
          </p>
          <p className="mt-2">
            Ez segít látni, mikor romlik vagy javul a hírek hangulata.
          </p>
        </div>
      </UtomModal>
    </>
  );
}
