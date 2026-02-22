"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SourceItem {
  source: string;
  total: number;
  hours: number[];
}

interface ApiResponse {
  success: boolean;
  sources: SourceItem[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WhatHappenedTodaySourceActivity() {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<ApiResponse>("/api/insights/source-activity", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.sources) || data.sources.length === 0) {
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  const sorted = [...data.sources].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const series = sorted.map((item) => ({ name: String(item.source ?? "ismeretlen"), data: [Number(item.total ?? 0)] }));

  const options = {
    chart: { type: "bar", toolbar: { show: false }, stacked: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "60%" } },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { show: false } },
    colors: ["#FF4D4F","#FFA940","#36CFC9","#40A9FF","#9254DE","#73D13D","#F759AB","#597EF7","#FFC53D","#5CDBD3"],
    dataLabels: { enabled: true, formatter: (val: any) => `${val} db`, style: { fontSize: "14px", fontWeight: 700, colors: isDark ? ["#fff"] : ["#000"] }, offsetX: 10 },
    legend: { show: true, position: "left", horizontalAlign: "left", labels: { colors: isDark ? "#fff" : "#000" }, markers: { size: 14 } },
    tooltip: { shared: false, theme: isDark ? "dark" : "light", y: { formatter: (val: any) => `${val} db` }, x: { formatter: () => "" }, marker: { show: false } },
    grid: { show: false },
  };

  const stableKey = `${theme}-${data.sources.length}`;

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>
      <ApexChart key={stableKey} options={options} series={series} type="bar" height={350} />
    </div>
  );
}
