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
        if (json && json.success) {
          setData(Array.isArray(json.sources) ? json.sources : []);
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
      if (!data || !Array.isArray(data)) {
        console.log("sorted useMemo: data invalid", data);
        return [];
      }
      const s = [...data].sort((a, b) => b.total - a.total);
      console.log("sorted useMemo result length:", s.length);
      return s;
    } catch (err) {
      console.error("sorted useMemo error:", err);
      return [];
    }
  }, [data]);

  // --- series memo with try/catch + debug
  const series = useMemo(() => {
    try {
      if (!sorted || !Array.isArray(sorted) || sorted.length === 0) {
        console.log("series useMemo: sorted empty");
        return [];
      }
      const s = sorted.map((item) => ({
        name: item.source,
        data: [item.total],
      }));
      console.log("series useMemo result length:", s.length);
      return s;
    } catch (err) {
      console.error("series useMemo error:", err);
      return [];
    }
  }, [sorted]);

  // --- options memo (depends on isDark) with debug
  const options: ApexCharts.ApexOptions = useMemo(() => {
    try {
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
      console.log("options useMemo computed (isDark):", isDark);
      return opts;
    } catch (err) {
      console.error("options useMemo error:", err);
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

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>

      <ApexChart
        key={stableKey}
        options={options}
        series={series}
        type="bar"
        height={350}
      />
    </div>
  );
}
