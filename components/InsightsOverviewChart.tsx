// components/InsightsOverviewChart.tsx

"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { hu } from "date-fns/locale";
import { Line } from "react-chartjs-2";
import { useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";
import { startOfHour, addHours, differenceInHours, subHours } from "date-fns";

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
  TimeScale,
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

/**
 * Kitölti a pontokat egy óránkénti rácsra (start..end), hiányzó időpontokra 0-t ad.
 * - points: eredeti pontok, { date, count }
 * - start, end: Date objektumok (inclusive)
 * - stepHours: rácslépés órában (alap 1)
 */
function fillSeriesWithZeros(points: any[], start: Date, end: Date, stepHours = 1) {
  const map = new Map<string, number>();
  (points || []).forEach((p) => {
    if (!p) return;
    const d = p?.date ? new Date(p.date) : null;
    if (!d || isNaN(d.getTime())) return;
    const key = startOfHour(d).toISOString();
    const val = typeof p?.count === "number" ? p.count : Number(p?.count) || 0;
    map.set(key, val);
  });

  const totalHours = Math.max(0, differenceInHours(end, start));
  const out: { x: Date; y: number }[] = [];
  for (let i = 0; i <= totalHours; i += stepHours) {
    const dt = addHours(start, i);
    const key = startOfHour(dt).toISOString();
    const y = map.has(key) ? (map.get(key) as number) : 0;
    out.push({ x: dt, y });
  }
  return out;
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

  const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

  const { datasets } = useMemo(() => {
    const ds: any[] = [];

    // Határozzuk meg a start és end időpontot a rácshoz
    const now = new Date();
    let start: Date;
    let end: Date;

    if (range === "24h") {
      end = startOfHour(now);
      start = startOfHour(subHours(end, 24));
    } else if (range === "7d") {
      end = startOfHour(now);
      start = startOfHour(subHours(end, 24 * 7));
    } else {
      // ha nincs range, próbáljuk meg a data alapján
      const allDates: Date[] = [];
      (data || []).forEach((cat: any) => {
        (cat?.points || []).forEach((p: any) => {
          if (p?.date) {
            const d = new Date(p.date);
            if (!isNaN(d.getTime())) allDates.push(d);
          }
        });
      });
      if (allDates.length) {
        // egyszerű: start = min hour, end = max hour
        const minD = new Date(Math.min(...allDates.map((d) => d.getTime())));
        const maxD = new Date(Math.max(...allDates.map((d) => d.getTime())));
        start = startOfHour(minD);
        end = startOfHour(maxD);
      } else {
        end = startOfHour(now);
        start = startOfHour(subHours(end, 24));
      }
    }

    // HISTORY: minden kategória kitöltése 0-okkal az óránkénti rácson
    (data || []).forEach((cat: any) => {
      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];

      // kitöltés óránként (ha szükséges, módosítható a lépés)
      const filled = fillSeriesWithZeros(points, start, end, 1);

      ds.push({
        label,
        data: filled,
        borderColor: color,
        backgroundColor: color + "22",
        showLine: true,
        stepped: false,
        cubicInterpolationMode: "monotone",
        tension: 0.15,
        // scriptable pointRadius: 0, de 0 értéknél kisebb pont jelenik meg
        pointRadius: (ctx: any) => {
          const y = ctx.parsed?.y;
          return y === 0 ? 3 : 0;
        },
        pointHoverRadius: 6,
        borderWidth: 1.2,
        fill: false,
        spanGaps: false,
      });
    });

    // AI FORECAST – csak 24h (ha kell, itt is kitölthető, de általában folyamatos)
    if (range === "24h" && forecast && typeof forecast === "object") {
      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter((k) => k !== "_default");
      Object.entries(forecast).forEach(([catName, fc]: any) => {
        if (!VALID_CATEGORIES.includes(catName)) return;
        const series = Array.isArray(fc) ? fc : [];
        const color = getCategoryColor(catName);

        // forecast esetén feltételezzük, hogy a predikció folyamatos; ha nem, lehet kitölteni is
        const mapped = series
          .map((p: any) => {
            const date = p?.date ? new Date(p.date) : null;
            const pred =
              typeof p?.predicted === "number" ? p.predicted : Number(p?.predicted) || 0;
            return date ? { x: date, y: pred } : null;
          })
          .filter(Boolean);

        ds.push({
          label: "AI előrejelzés",
          data: mapped,
          borderColor: color,
          borderDash: [6, 6],
          borderWidth: 1.2,
          cubicInterpolationMode: "monotone",
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
          spanGaps: true,
          _isForecast: true,
          _aiCategory: catName,
        });
      });

      // dummy AI legend
      ds.push({
        label: "AI előrejelzés",
        data: [],
        borderColor: "#999",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        _isDummyAiLegend: true,
        _isForecast: true,
      });
    }

    return { datasets: ds };
  }, [data, forecast, range, theme]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        type: "time",
        adapters: { date: { locale: hu } },
        time: { unit: "hour", displayFormats: { hour: "HH:mm" } },
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        beginAtZero: true,
        min: 0, // biztosítjuk, hogy a tengely 0-tól induljon
        suggestedMax: 5,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          generateLabels: (chart: any) => {
            const original =
              ChartJS.defaults.plugins.legend.labels.generateLabels(chart);

            return original.filter((item: any) => {
              const ds = chart.data.datasets[item.datasetIndex];
              if (!ds) return false;
              const lbl = (ds.label || "").toString().toLowerCase();
              if (lbl === "hír" || lbl === "hir" || lbl === "news") return false;
              if (!ds._isForecast) return true;
              if (range === "24h" && ds._isDummyAiLegend) return true;
              return false;
            });
          },
        },
        onClick: (e: any, item: any, legend: any) => {
          const chart = legend.chart;
          const idx = item.datasetIndex;
          const ds = chart.data.datasets[idx];

          if (range !== "24h") {
            const visible = chart.isDatasetVisible(idx);
            chart.setDatasetVisibility(idx, !visible);
            chart.update();
            return;
          }

          if (ds._isDummyAiLegend) {
            const anyVisible = chart.data.datasets.some(
              (d: any, i: number) =>
                d._isForecast &&
                !d._isDummyAiLegend &&
                chart.isDatasetVisible(i)
            );

            chart.data.datasets.forEach((d: any, i: number) => {
              if (d._isForecast && !d._isDummyAiLegend) {
                chart.setDatasetVisibility(i, !anyVisible);
              }
            });

            chart.update();
            return;
          }

          const visible = chart.isDatasetVisible(idx);
          chart.setDatasetVisibility(idx, !visible);
          chart.update();
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
          title: (items: any) => {
            const d = new Date(items[0].parsed.x);
            return d.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
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
      decimation: { enabled: false },
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line key={range + theme} data={{ datasets }} options={options} />
    </div>
  );
}
/** stabil verzió
 * - sima görbe (monotone)
 * - hiányzó időpontok kitöltése 0-val, y.min = 0
 */
