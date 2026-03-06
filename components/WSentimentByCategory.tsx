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

export default function WSentimentByCategory() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR(
    "/api/insights/sentiment/by-category",
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

  const categories = Object.keys(data.categories || {});
  const negativeValues = categories.map(
    (c) => data.categories[c].negative || 0
  );

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      background: "transparent",
      foreColor: isDark ? "#fff" : "#000",
      toolbar: { show: false },
      animations: { enabled: true },
      zoom: { enabled: false },
      selection: { enabled: false },
      brush: { enabled: false },
    },

    theme: { mode: isDark ? "dark" : "light" },

    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 6,
        colors: {
          ranges: [],
          backgroundBarOpacity: 1,
        },
        distributed: false,
      },
    },

    xaxis: {
      categories,
      crosshairs: { show: false },
      labels: {
        rotate: -30,
        style: {
          fontWeight: 600,
          colors: categories.map(() => (isDark ? "#e2e8f0" : "#334155")),
        },
      },
    },

    yaxis: {
      labels: {
        formatter: (v) => `${v}`,
        style: { colors: isDark ? "#e2e8f0" : "#334155" },
      },
    },

    dataLabels: {
      enabled: true,
      formatter: (val) => {
        const num = Number(val);
        return isNaN(num) ? "" : `${num}`;
      },
      style: {
        colors: [isDark ? "#fff" : "#000"],
        fontSize: "12px",
        fontWeight: 600,
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
      shared: false,
      intersect: false,
    },

    legend: {
      labels: { colors: isDark ? "#fff" : "#000" },
      onItemHover: { highlightDataSeries: false },
    },

    colors: ["#ef4444"],
  };

  const series = [
    {
      name: "Negatív cikkek száma",
      data: negativeValues,
    },
  ];

  return (
    <>
      <div
        className="relative z-10 p-12 rounded-3xl wsource-card--ghost"
        style={{ background: "var(--bs-body-bg)" }}
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Kategóriahangulat – negatív arány
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-0"
          >
            <img src="/icons/info-svg.svg" alt="info" width={26} height={26} />
          </button>
        </div>

        <div className="min-h-[340px]">
          <Chart options={options} series={series} type="bar" height={420} />
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
            Mit jelent a kategóriahangulat?
          </h3>

          {/* Bevezető */}
          <p className="text-base font-semibold text-center">
            Ez a grafikon azt mutatja, hogy a mai napon
            <span style={{ color: "#ef4444" }}> <b>mely témákban jelent meg a legtöbb negatív hangulatú hír</b></span>.
          </p>

          {/* Ikonos magyarázat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">🗂️</div>
              <p>
                Minden cikk egy kategóriába kerül (pl. politika, gazdaság, tech).
                A rendszer megszámolja, hogy kategóriánként hány
                <b> negatív hangulatú</b> cikk jelent meg ma.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📉</div>
              <p>
                A magasabb érték azt jelzi, hogy az adott témában
                <b> több negatív hír</b> jelent meg a nap folyamán.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">🔍</div>
              <p>
                Ez segít megérteni, mely területek domináltak
                <b> negatív hangulatú tartalommal</b>.
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
              <li><b>Magas érték</b> → sok negatív hír az adott témában.</li>
              <li><b>Alacsony érték</b> → kevés negatív tartalom.</li>
              <li>A mutató <i>nem minőségi értékelés</i>, csak a hangulat arányát mutatja.</li>
            </ul>
          </div>

          {/* Lezárás */}
          <p className="text-center">
            A kategóriahangulat segít megérteni, mely témák járultak hozzá
            leginkább a mai nap negatív hírtónusához.
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
