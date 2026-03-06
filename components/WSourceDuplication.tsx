"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import UtomModal from "@/components/UtomModal";
import { useUserStore } from "@/store/useUserStore";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DuplicationItem {
  source: string;
  original: number;
  duplicate: number;
  duplicationScore: number;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceDuplication() {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  useEffect(() => {
    console.debug("WSourceDuplication mounted");
    return () => console.debug("WSourceDuplication unmounted");
  }, []);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    duplication: DuplicationItem[];
  }>("/api/insights/duplication", fetcher, {
    refreshInterval: 60000,
  });

  const items = useMemo(() => {
    if (!data?.duplication) return [];
    return [...data.duplication].sort(
      (a, b) => b.duplicationScore - a.duplicationScore
    );
  }, [data]);

  if (isLoading) return <div className="p-12 text-center">Betöltés...</div>;

  if (error || !data?.success)
    return (
      <div className="p-12 text-center text-red-500">
        Hiba az adatok betöltésekor
      </div>
    );

  const series = [
    {
      name: "Másolási arány (%)",
      data: items.map((i) => i.duplicationScore),
    },
  ];

  const palette = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#a855f7",
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      animations: { enabled: true },
      foreColor: isDark ? "#fff" : "#000",
      zoom: { enabled: false },
      background: "var(--bs-body-bg, #f8fafc)",
    },
    theme: { mode: isDark ? "dark" : "light" },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: false,
        columnWidth: "45%",
        distributed: true,
      },
    },
    colors: palette,
    dataLabels: {
      enabled: true,
      formatter: (val) => `${(val as number).toFixed(1)}%`,
      style: { colors: [isDark ? "#fff" : "#000"], fontSize: "12px", fontWeight: 600 },
    },
    xaxis: {
      categories: items.map((i) => i.source),
      crosshairs: { show: false },
      labels: {
        rotate: -30,
        style: { colors: items.map(() => (isDark ? "#fff" : "#000")), fontWeight: 600 },
      },
    },
    yaxis: {
      crosshairs: { show: false },
      labels: { formatter: (val) => `${val}%` },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      x: { show: false },
      marker: { show: false },
      y: {
        formatter: (val, opts) => {
          const item = items[opts.dataPointIndex];
          const score = Number(val);
          return `Másolási arány: ${score.toFixed(1)}%
Eredeti: ${item.original}
Átvett: ${item.duplicate}`;
        },
      },
    },
    grid: { borderColor: isDark ? "#334155" : "#e2e8f0" },
  };

  return (
    <>
      <div
        className={`relative z-10 p-12 rounded-3xl transition-all duration-500 wsource-card--ghost
          ${isDark ? "text-white" : "text-slate-900"}`}
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Másolási arány források szerint
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            aria-label="Információ"
            type="button"
            className="w-[26px] h-[26px] p-0 m-0 flex items-center justify-center bg-transparent border-0"
          >
            <img
              src="/icons/info-svg.svg"
              alt="info"
              className="w-[26px] h-[26px] object-contain pointer-events-none"
            />
          </button>
        </div>

        <div className="relative z-0 min-h-[340px]">
          <Chart options={options} series={series} type="bar" height={420} />
        </div>
      </div>

      {/* 🔥 ÚJ, FELTUNINGOLT UTOM MODAL */}
      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mi az a másolási arány?"
      >
        <div className="text-sm leading-relaxed space-y-6">

          {/* Bevezető */}
          <p className="text-base font-semibold text-center">
            A <b>másolási arány</b> azt mutatja meg, hogy egy hírforrás
            <span style={{ color: "#ef4444" }}> <b>milyen gyakran vesz át</b></span>
            más forrásoktól már korábban megjelent témákat.
          </p>

          {/* Ikonos magyarázat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">📰</div>
              <p>
                <b>Megjelenik egy új téma</b> a hírekben. A rendszer azonosítja,
                melyik forrás ír róla <b>elsőként</b>.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">🔁</div>
              <p>
                Ha egy másik forrás <b>később</b> ír ugyanerről a témáról,
                akkor azt <b>átvett tartalomnak</b> tekintjük.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📊</div>
              <p>
                A rendszer minden forrásnál megszámolja, hányszor volt
                <b>eredeti</b> és hányszor <b>átvett</b> a megjelenés.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">📉</div>
              <p>
                A <b>másolási arány</b> azt mutatja meg, hogy az összes
                megjelenésből mekkora rész volt átvett tartalom.
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
              <li><b>Alacsony arány</b> → a forrás többnyire saját témákat dolgoz fel.</li>
              <li><b>Magas arány</b> → a forrás gyakran vesz át másoktól.</li>
              <li>A mutató <i>nem minőségi értékelés</i>, csak a megjelenések eredetiségét méri.</li>
            </ul>
          </div>

          {/* Lezárás */}
          <p className="text-center">
            A cél, hogy átlátható legyen, mely források mennyire támaszkodnak
            saját tartalomra, és kik azok, akik inkább mások témáit dolgozzák fel.
          </p>

          <p
            className="text-xs italic text-center mt-6"
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            A rangsor AI által került meghatározásra.
          </p>

        </div>
      </UtomModal>
    </>
  );
}
