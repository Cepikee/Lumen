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
    return <div className="p-12 text-center text-red-500">Hiba az adatok betöltésekor</div>;

  const categories = Object.keys(data.categories || {});
  const negativeValues = categories.map(
    (c) => data.categories[c].negative || 0
  );

  const options: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, foreColor: isDark ? "#fff" : "#000" },
    theme: { mode: isDark ? "dark" : "light" },
    plotOptions: { bar: { horizontal: false, borderRadius: 6 } },
    colors: ["#ef4444"],
    xaxis: {
      categories,
      labels: { rotate: -30, style: { fontWeight: 600 } },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}`,
    },
    yaxis: {
      labels: { formatter: (v) => `${v}` },
    },
  };

  const series = [
    {
      name: "Negatív cikkek száma",
      data: negativeValues,
    },
  ];

  return (
    <>
      <div className="relative z-10 p-12 rounded-3xl wsource-card--ghost">
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

      <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title="Mit mutat ez a grafikon?">
        <div className="text-sm leading-relaxed">
          <p>Melyik kategóriában hány negatív hangulatú cikk jelent meg ma.</p>
          <p className="mt-2">Ez segít látni, mely témák a leginkább negatívak a hírekben.</p>
        </div>
      </UtomModal>
    </>
  );
}
