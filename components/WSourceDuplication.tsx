"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import UtomModal from "@/components/UtomModal";
import { useUserStore } from "@/store/useUserStore";
import InsightsEmptyState from "./InsightsEmptyState";

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
      "x-api-key": "",
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`duplication_${r.status}`);
    const json = await r.json();
    if (!json || !Array.isArray(json.duplication)) throw new Error("invalid_duplication_response");
    return json;
  });

export default function WSourceDuplication({ period = "24h", dark = false }: { period?: string; dark?: boolean }) {
  const theme = useUserStore((s) => s.theme);
  const [openInfo, setOpenInfo] = useState(false);

  useEffect(() => {
    console.debug("WSourceDuplication mounted");
    return () => console.debug("WSourceDuplication unmounted");
  }, []);

  const isDark = dark ||
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean,
    duplication: DuplicationItem[];
  }>(`/api/premium-insights/duplication?period=${encodeURIComponent(period)}`, fetcher, {
    refreshInterval: 60000,
  });

  const items = useMemo(() => {
    if (!Array.isArray(data?.duplication)) return [];
    return data.duplication.map((item) => ({
      ...item,
      original: Number.isFinite(Number(item.original)) ? Number(item.original) : 0,
      duplicate: Number.isFinite(Number(item.duplicate)) ? Number(item.duplicate) : 0,
      duplicationScore: Number.isFinite(Number(item.duplicationScore)) ? Number(item.duplicationScore) : 0,
    })).sort(
      (a, b) => b.duplicationScore - a.duplicationScore
    );
  }, [data]);

  if (isLoading) return <div className="p-12 text-center">BetĂ¶ltĂ©s...</div>;

  if (error || !data?.success)
    return (
      <div className="p-12 text-center text-red-500">
        Hiba az adatok betĂ¶ltĂ©sekor
      </div>
    );

  if (items.length === 0) {
    return <InsightsEmptyState period={period} />;
  }

  const series = [
    {
      name: "MĂˇsolĂˇsi arĂˇny (%)",
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
          return `MĂˇsolĂˇsi arĂˇny: ${score.toFixed(1)}%
Eredeti: ${item.original}
Ătvett: ${item.duplicate}`;
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
            MĂˇsolĂˇsi arĂˇny forrĂˇsok szerint
          </h2>

          <button
            onClick={() => setOpenInfo(true)}
            aria-label="InformĂˇciĂł"
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

      {/* đź”Ą ĂšJ, FELTUNINGOLT UTOM MODAL */}
      <UtomModal
        show={openInfo}
        onClose={() => setOpenInfo(false)}
        title="Mi az a mĂˇsolĂˇsi arĂˇny?"
      >
        <div className="text-sm leading-relaxed space-y-6">

          {/* BevezetĹ‘ */}
          <p className="text-base font-semibold text-center">
            A <b>mĂˇsolĂˇsi arĂˇny</b> azt mutatja meg, hogy egy hĂ­rforrĂˇs
            <span style={{ color: "#ef4444" }}> <b>milyen gyakran vesz Ăˇt</b></span>
            mĂˇs forrĂˇsoktĂłl mĂˇr korĂˇbban megjelent tĂ©mĂˇkat.
          </p>

          {/* Ikonos magyarĂˇzat */}
          <div className="space-y-5">

            <div className="flex items-start gap-4">
              <div className="text-2xl">đź“°</div>
              <p>
                <b>Megjelenik egy Ăşj tĂ©ma</b> a hĂ­rekben. A rendszer azonosĂ­tja,
                melyik forrĂˇs Ă­r rĂłla <b>elsĹ‘kĂ©nt</b>.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">đź”</div>
              <p>
                Ha egy mĂˇsik forrĂˇs <b>kĂ©sĹ‘bb</b> Ă­r ugyanerrĹ‘l a tĂ©mĂˇrĂłl,
                akkor azt <b>Ăˇtvett tartalomnak</b> tekintjĂĽk.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">đź“Š</div>
              <p>
                A rendszer minden forrĂˇsnĂˇl megszĂˇmolja, hĂˇnyszor volt
                <b>eredeti</b> Ă©s hĂˇnyszor <b>Ăˇtvett</b> a megjelenĂ©s.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-2xl">đź“‰</div>
              <p>
                A <b>mĂˇsolĂˇsi arĂˇny</b> azt mutatja meg, hogy az Ă¶sszes
                megjelenĂ©sbĹ‘l mekkora rĂ©sz volt Ăˇtvett tartalom.
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
              <li><b>Alacsony arĂˇny</b> â†’ a forrĂˇs tĂ¶bbnyire sajĂˇt tĂ©mĂˇkat dolgoz fel.</li>
              <li><b>Magas arĂˇny</b> â†’ a forrĂˇs gyakran vesz Ăˇt mĂˇsoktĂłl.</li>
              <li>A mutatĂł <i>nem minĹ‘sĂ©gi Ă©rtĂ©kelĂ©s</i>, csak a megjelenĂ©sek eredetisĂ©gĂ©t mĂ©ri.</li>
            </ul>
          </div>

          {/* LezĂˇrĂˇs */}
          <p className="text-center">
            A cĂ©l, hogy ĂˇtlĂˇthatĂł legyen, mely forrĂˇsok mennyire tĂˇmaszkodnak
            sajĂˇt tartalomra, Ă©s kik azok, akik inkĂˇbb mĂˇsok tĂ©mĂˇit dolgozzĂˇk fel.
          </p>

          <p
            className="text-xs italic text-center mt-6"
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            A rangsor AI Ăˇltal kerĂĽlt meghatĂˇrozĂˇsra.
          </p>

        </div>
      </UtomModal>
    </>
  );
}


