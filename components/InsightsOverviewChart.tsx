"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import { useMemo } from "react";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

type Point = { date: string; count: number };
type CategorySeries = { category: string; points: Point[] };

export default function InsightsOverviewChart({
  data,
  height = 300,
}: {
  data: CategorySeries[];
  height?: number;
}) {
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark ? "#444" : "#eee";

  const palette = [
    "#ff6b6b",
    "#4dabf7",
    "#ffd166",
    "#06d6a0",
    "#9b5de5",
    "#f06595",
    "#00c2d1",
    "#ff922b",
  ];

  // --- Detect if this is 24h mode (hourly timestamps) ---
  const isHourly = useMemo(() => {
    if (!data || data.length === 0) return false;
    const sample = data[0].points[0]?.date || "";
    return sample.length > 10; // "YYYY-MM-DD HH:MM:SS"
  }, [data]);

  // --- Chart.js data ---
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const labels = data[0].points.map((p) => p.date);

    return {
      labels,
      datasets: data.map((cat, idx) => ({
        label: cat.category,
        data: cat.points.map((p) => p.count),
        borderColor: palette[idx % palette.length],
        backgroundColor: palette[idx % palette.length] + "33",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        fill: false,
      })),
    };
  }, [data]);

  if (!chartData) return null;

  // --- Chart.js options ---
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: "easeOutQuart",
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 20,
          callback: function (value: any, index: number) {
            const raw = chartData.labels[index];

            if (isHourly) {
              // "YYYY-MM-DD HH:MM:SS" → "HH:MM"
              return raw.slice(11, 16);
            }

            // "YYYY-MM-DD"
            return raw;
          },
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? "#222" : "#fff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#ddd" : "#333",
        borderColor: isDark ? "#444" : "#ccc",
        borderWidth: 1,
        callbacks: {
          title: function (items: any) {
            const raw = items[0].label;

            if (isHourly) {
              // Tooltip full timestamp
              return raw.replace("T", " ");
            }

            return raw;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
