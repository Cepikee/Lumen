"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
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
  // keep other fields optional if backend returns extras
  [k: string]: any;
}

export default function WhatHappenedTodaySourceActivity() {
  // --- state
  const [data, setData] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- theme from zustand
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // --- debug: render start
  console.log("WHSourceActivity render start", {
    theme,
    isDark,
    dataLength: data?.length ?? 0,
    loading,
  });

  // --- fetch with mounted guard and debug logs
  useEffect(() => {
    let mounted = true;

    async function load() {
      console.log("WHSourceActivity fetch start");
      try {
        const res = await fetch("/api/insights/source-activity");
        const json: ApiResponse = await res.json();
        console.log("WHSourceActivity fetch result", json);
        if (!mounted) {
          console.log("WHSourceActivity fetch result ignored (unmounted)");
          return;
        }
        if (json && json.success && Array.isArray(json.sources)) {
          setData(json.sources);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("WHSourceActivity fetch error:", err);
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000); // 1 percenként frissít
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // --- loading / empty states
  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (!data || data.length === 0) {
    console.log("WHSourceActivity: no data to render");
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  // --- safe sorted memo with try/catch + debug
  const sorted = useMemo(() => {
    try {
      console.log("sorted useMemo start", { dataLen: data.length });
      if (!data || !Array.isArray(data)) {
        console.log("sorted useMemo: data invalid", data);
        return [];
      }
      const s = [...data].sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));
      console.log("sorted useMemo result length:", s.length);
      return s;
    } catch (err) {
      console.error("sorted useMemo error:", err);
      console.trace();
      return [];
    }
  }, [data]);

  // --- series memo with try/catch + debug
  const series = useMemo(() => {
    try {
      console.log("series useMemo start", { sortedLen: sorted.length });
      if (!sorted || !Array.isArray(sorted) || sorted.length === 0) {
        console.log("series useMemo: sorted empty");
        return [];
      }
      const s = sorted.map((item) => ({
        name: String(item?.source ?? "unknown"),
        data: [Number(item?.total ?? 0)],
      }));
      console.log("series useMemo result length:", s.length, s.slice(0, 3));
      return s;
    } catch (err) {
      console.error("series useMemo error:", err);
      console.trace();
      return [];
    }
  }, [sorted]);

  // --- options memo (depends on isDark) with debug
  const options: ApexCharts.ApexOptions = useMemo(() => {
    try {
      console.log("options useMemo start", { isDark });
      const opts: ApexCharts.ApexOptions = {
        chart: {
          type: "bar",
          toolbar: { show: false },
          stacked: false,
        },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 6,
            barHeight: "60%",
          },
        },
        xaxis: {
          labels: { show: false },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          labels: { show: false },
        },
        colors: [
          "#FF4D4F",
          "#FFA940",
          "#36CFC9",
          "#40A9FF",
          "#9254DE",
          "#73D13D",
          "#F759AB",
          "#597EF7",
          "#FFC53D",
          "#5CDBD3",
        ],
        dataLabels: {
          enabled: true,
          formatter: (val: any) => `${val} db`,
          style: {
            fontSize: "14px",
            fontWeight: 700,
            colors: isDark ? ["#fff"] : ["#000"],
          },
          offsetX: 10,
        },
        legend: {
          show: true,
          position: "left",
          horizontalAlign: "left",
          fontSize: "15px",
          fontWeight: 600,
          labels: {
            colors: isDark ? "#fff" : "#000",
          },
          markers: {
            size: 14,
          },
        },
        tooltip: {
          shared: false,
          theme: isDark ? "dark" : "light",
          y: {
            formatter: (val: any) => `${val} db`,
          },
          x: {
            formatter: () => "",
          },
          marker: {
            show: false,
          },
        },
        grid: { show: false },
      };
      console.log("options useMemo computed");
      return opts;
    } catch (err) {
      console.error("options useMemo error:", err);
      console.trace();
      return {};
    }
  }, [isDark]);

  // --- stable key (avoid JSON.stringify)
  const stableKey = `${theme}-${data.length}`;

  // --- final debug before render
  console.log("WHSourceActivity final render", {
    stableKey,
    seriesLength: series.length,
    topSeries: series.slice(0, 3),
  });

  // --- TEMP ISOLATION: if you want to isolate ApexChart, uncomment the block below
  // and comment out the ApexChart render. This helps determine if ApexChart is the cause.
  //
  // return (
  //   <div className="wht-source-activity">
  //     <h5 className="mb-3 text-center">Források aktivitása ma</h5>
  //     <div style={{ padding: 20, border: "1px dashed #ccc" }}>
  //       <pre style={{ whiteSpace: "pre-wrap" }}>
  //         {JSON.stringify({ stableKey, series, options }, null, 2)}
  //       </pre>
  //     </div>
  //   </div>
  // );

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>

      <ApexChart key={stableKey} options={options} series={series} type="bar" height={350} />
    </div>
  );
}
