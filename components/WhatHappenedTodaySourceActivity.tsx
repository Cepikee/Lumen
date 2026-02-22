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
  const [data, setData] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // ⭐ Automatikus frissítés (InsightsOverviewChart mintájára)
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/source-activity");
        const json: ApiResponse = await res.json();
        if (json.success) {
          setData(json.sources);
        }
      } catch (err) {
        console.error("Source activity fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    load(); // első betöltés

    const interval = setInterval(load, 60_000); // ⭐ 1 percenként frissít
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (!data.length) {
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  // ⭐ Rendezés minden frissítéskor
  const sorted = useMemo(() => {
  if (!data || !Array.isArray(data)) return [];
  return [...data].sort((a, b) => b.total - a.total);
}, [data]);


  // ⭐ Series újraszámolása (InsightsOverviewChart mintájára)
  const series = useMemo(() => {
  if (!sorted.length) return [];
  return sorted.map((item) => ({
    name: item.source,
    data: [item.total],
  }));
}, [sorted]);


  // ⭐ Options újraszámolása theme alapján
  const options: ApexCharts.ApexOptions = useMemo(() => {
    return {
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
        formatter: (val) => `${val} db`,
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
          formatter: (val) => `${val} db`,
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
  }, [theme]);

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>

      {/* ⭐ Ugyanaz a kulcs logika, mint az InsightsOverviewChart-ban */}
      <ApexChart
        key={theme + "-" + data.length}
        options={options}
        series={series}
        type="bar"
        height={350}
      />
    </div>
  );
}
