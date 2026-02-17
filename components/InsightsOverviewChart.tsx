// components/InsightsOverviewChart.tsx

"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,        // ⭐ TIME SCALE HELYETT CATEGORY SCALE
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";

const crosshairPlugin = {
  id: "crosshair",
  afterDatasetsDraw(chart: any) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active || active.length === 0) return;
    const ctx = chart.ctx;
    const { x } = active[0].element;
    const topY = chart.chartArea.top;
    const bottomY = chart.chartArea.bottom;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#8884";
    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,        // ⭐ EZT REGISZTRÁLJUK
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  crosshairPlugin
);

const CATEGORY_COLORS: Record<string, string> = {
  Sport: "#ef4444",
  Politika: "#3b82f6",
  Gazdaság: "#00ff5e",
  Tech: "#f97316",
  Kultúra: "#eab308",
  Oktatás: "#a855f7",
  Egészségügy: "#e600ee",
  Közélet: "#578f68",
  _default: "#6b7280",
};

function getCategoryColor(c: string) {
  return CATEGORY_COLORS[c] ?? CATEGORY_COLORS._default;
}

export default function InsightsOverviewChart({
  data,
  forecast = {},
  height = 300,
  range = "24h",
}: any) {
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark
    ? "rgba(255,255,255,0.15)"
    : "rgba(0,0,0,0.12)";

  // ⭐ CATEGORY SCALE-HEZ: előre formázott HH:mm stringek
  const { labels, datasets } = useMemo(() => {
    const allLabels = new Set<string>();
    const ds: any[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {
      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      const formatted = points.map((p: any) => {
        const d = new Date(p.date);
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        const key = `${hh}:${mm}`;
        allLabels.add(key);
        return { x: key, y: p.count };
      });

      ds.push({
        label,
        data: formatted,
        borderColor: color,
        backgroundColor: color + "22",
        cubicInterpolationMode: "monotone",   // ⭐ UGYANAZ, MINT A DEMÓBAN
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2,
        fill: false,
      });
    });

    // FORECAST
    if (range === "24h" && forecast && typeof forecast === "object") {
      Object.entries(forecast).forEach(([catName, fc]: any) => {
        const color = getCategoryColor(catName);
        const formatted = (fc || []).map((p: any) => {
          const d = new Date(p.date);
          const hh = d.getHours().toString().padStart(2, "0");
          const mm = d.getMinutes().toString().padStart(2, "0");
          const key = `${hh}:${mm}`;
          allLabels.add(key);
          return { x: key, y: p.predicted };
        });

        ds.push({
          label: `AI előrejelzés (${catName})`,
          data: formatted,
          borderColor: color,
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          fill: false,
        });
      });
    }

    return {
      labels: Array.from(allLabels).sort(),
      datasets: ds,
    };
  }, [data, forecast, range, theme]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        type: "category",               // ⭐ TIME SCALE HELYETT CATEGORY SCALE
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
    plugins: {
      legend: {
        labels: { color: textColor },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? "#222" : "#fff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#ddd" : "#333",
        borderColor: isDark ? "#444" : "#ccc",
        borderWidth: 1,
        callbacks: {
          title: (items: any) => {
            const time = items[0].label;
            return `Időpont: ${time}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: { enabled: true, mode: "x" },
      },
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  );
}
