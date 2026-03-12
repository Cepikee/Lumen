"use client";

import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CategoryScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { hu } from "date-fns/locale";
import { Bar } from "react-chartjs-2";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";

ChartJS.register(
  BarElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Tooltip,
  Legend,
  zoomPlugin
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

  const { datasets } = useMemo(() => {

    const ds: any[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {

      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      ds.push({
        label,
        data: points
          .map((p: any) => {

            const dateVal = p?.date ? new Date(p.date) : null;

            const countVal =
              typeof p?.count === "number"
                ? p.count
                : Number(p?.count) || 0;

            return dateVal ? { x: dateVal, y: countVal } : null;

          })
          .filter(Boolean),

        backgroundColor: color,
        borderWidth: 0,
        stack: "news",

      });

    });

    // AI FORECAST
    if (range === "24h" && forecast && typeof forecast === "object") {

      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter(
        k => k !== "_default"
      );

      Object.entries(forecast).forEach(([catName, fc]: any) => {

        if (!VALID_CATEGORIES.includes(catName)) return;

        const series = Array.isArray(fc) ? fc : [];
        const color = getCategoryColor(catName);

        ds.push({

          label: `AI előrejelzés · ${catName}`,

          data: series
            .map((p: any) => {

              const date = p?.date ? new Date(p.date) : null;

              const pred =
                typeof p?.predicted === "number"
                  ? p.predicted
                  : Number(p?.predicted) || 0;

              return date ? { x: date, y: pred } : null;

            })
            .filter(Boolean),

          backgroundColor: color + "66",
          borderColor: color,
          borderWidth: 1,
          borderDash: [6, 6],
          stack: "forecast",

          _isForecast: true,
          _aiCategory: catName,

        });

      });

    }

    return { datasets: ds };

  }, [data, forecast, range]);

  const options: any = {

    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: "nearest",
      intersect: false
    },

    scales: {

      x: {
        type: "time",
        stacked: true,
        adapters: { date: { locale: hu } },
        time: {
          unit: range === "24h" ? "minute" : "hour",
          displayFormats: {
            minute: "HH:mm",
            hour: "HH:mm"
          }
        },
        ticks: { color: textColor },
        grid: { color: gridColor },
      },

      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },

    },

    plugins: {

      legend: {
        labels: {
          color: textColor
        }
      },

      tooltip: {

        backgroundColor: isDark ? "#222" : "#fff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#ddd" : "#333",
        borderColor: isDark ? "#444" : "#ccc",
        borderWidth: 1,

        callbacks: {

          title: (items: any) => {

            const d = new Date(items[0].parsed.x);

            return d.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });

          },

          label: (ctx: any) => {

            const ds = ctx.dataset;
            const v = ctx.parsed.y;

            if (ds._isForecast) {
              return `AI előrejelzés · ${ds._aiCategory}: ${v}`;
            }

            return `${ds.label}: ${v}`;

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
      <Bar key={range + theme} data={{ datasets }} options={options} />
    </div>
  );
}