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
      background: "transparent",
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
      labels: { colors: isDark ? "#fff" : "#000" },
      onItemHover: { highlightDataSeries: false },
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
        style={{ background: "var(--bs-body-bg)" }}
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

      {/* 🔥 ÚJ, FELTUNINGOLT UTOM MODAL */}
      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mit mutat ez a grafikon?"
      >
        <div className="text-sm leading-relaxed space-y-6">

          {/* Belső cím */}
          <h3 className="text-xl font-bold text-center mb-2">
            Hogyan változik a hírek hangulata óráról órára?
          </h3>

          {/* Bevezető */}
          <p className="text-base font-semibold text-center">
            Ez a grafikon azt mutatja, hogy a mai napon
            <span style={{ color: "#22c55e" }}> <b>pozitív</b></span> és
            <span style={{ color: "#ef4444" }}> <b>negatív</b></span> hangulatú hírek
            hogyan oszlanak meg óránként.
          </p>

          {/* Ikonos magyarázat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">⏱️</div>
              <p>
                A rendszer minden cikket besorol hangulat szerint, majd
                <b> óránként összesíti</b>, hogy mennyi pozitív és negatív hír jelent meg.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📈</div>
              <p>
                A vonalak azt mutatják, mikor volt több
                <b> pozitív</b> vagy <b>negatív</b> hangulatú tartalom.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">🔍</div>
              <p>
                Így könnyen észrevehető, ha egy adott órában
                <b> hirtelen romlik</b> vagy <b>javul</b> a hírek hangulata.
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
              <li><b>Emelkedő piros vonal</b> → több negatív hír érkezik.</li>
              <li><b>Emelkedő zöld vonal</b> → pozitívabb a hírek hangulata.</li>
              <li><b>Hirtelen kiugrás</b> → valamilyen esemény erősen befolyásolta a hangulatot.</li>
              <li>A mutató <i>nem minőségi értékelés</i>, csak a hangulat arányát mutatja.</li>
            </ul>
          </div>

          {/* Lezárás */}
          <p className="text-center">
            A hangulat időbeli alakulása segít megérteni,
            hogyan változik a közbeszéd tónusa a nap folyamán.
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
