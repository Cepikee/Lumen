"use client";

import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useUserStore } from "@/store/useUserStore";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface HeatmapResponse {
  success: boolean;
  categories: string[];
  hours: number[];
  matrix: Record<string, Record<number, number>>;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());


export default function WhatHappenedTodayHeatmap() {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const tooltipBg = isDark ? "#222" : "#fff";
  const tooltipTitle = isDark ? "#fff" : "#000";
  const tooltipBody = isDark ? "#ddd" : "#333";
  const tooltipBorder = isDark ? "#444" : "#ccc";

  const { data, error, isLoading } = useSWR<HeatmapResponse>("/api/insights/heatmap", fetcher, {
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

  if (error || !data || !data.success) {
    return <div className="text-danger">Nem sikerült betölteni az adatokat.</div>;
  }

  const { categories = [], hours = [], matrix = {} } = data;

  const order = ["Politika", "Gazdaság", "Közélet", "Kultúra", "Egészségügy", "Oktatás"];
  const orderedCategories = order.filter((c) => categories.includes(c));

  const colors: Record<string, string> = {
    Politika: "#d81b60",
    Gazdaság: "#f9a825",
    Közélet: "#43a047",
    Kultúra: "#00acc1",
    Egészségügy: "#e53935",
    Oktatás: "#3949ab",
  };

  // egyszerű, szinkron számítás (nincs useMemo)
  const chartData = (() => {
    if (!Array.isArray(hours) || hours.length === 0 || orderedCategories.length === 0) {
      return { labels: [], datasets: [] };
    }
    const datasets = orderedCategories.map((cat) => {
      const row = hours.map((h) => {
        const v = matrix?.[cat]?.[h];
        return typeof v === "number" ? v : Number(v) || 0;
      });
      return {
        label: cat,
        data: row,
        backgroundColor: colors[cat] ?? "#888",
        borderWidth: 0,
      };
    });
    return { labels: hours.map((h) => `${h}:00`), datasets };
  })();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: textColor } },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw} cikk` },
      },
    },
    scales: {
      x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: textColor }, grid: { color: gridColor } },
    },
  };

  const stableKey = `${theme}-${hours?.length ?? 0}-${categories?.length ?? 0}`;

  if (!chartData || !Array.isArray(chartData.datasets)) {
    return (
      <div className="wht-heatmap" style={{ height: "350px" }}>
        <h5 className="mb-3">Kategóriák aktivitása óránként</h5>
        <div className="text-muted">Nincs megjeleníthető adat.</div>
      </div>
    );
  }

  return (
    <div className="wht-heatmap" style={{ height: "350px" }}>
      <h5 className="mb-3">Kategóriák aktivitása óránként</h5>
      <Bar key={stableKey} data={chartData} options={options} />
    </div>
  );
}
