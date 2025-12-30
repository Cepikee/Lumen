"use client";
import React, { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Chart
} from "chart.js";
import type { ChartOptions, ScriptableLineSegmentContext } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

type HistoryPoint = { day?: string; hour?: number; freq: number };

interface Props {
  history: HistoryPoint[];
  period?: string;
  width?: number; // opcionális, felülírható
  height?: number;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base];
  const b = sorted[Math.min(base + 1, sorted.length - 1)];
  return a + (b - a) * rest;
}

function computeSegmentPercents(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    const prev = Math.max(1, values[i] ?? 1);
    const next = Math.max(0, values[i + 1] ?? 0);
    const growth = (next - prev) / prev;
    out.push(Math.abs(growth * 100));
  }
  return out;
}

function getIndexColor(index: number): string {
  if (index === 1) return "#9CA3AF"; // szürke
  if (index <= 3) return "#FACC15";  // sárga
  if (index <= 5) return "#FB923C";  // narancs
  if (index <= 7) return "#3B82F6";  // kék
  return "#8B5CF6";                  // lila
}
function getAdaptiveIndex(percent: number, qs: { q25: number; q50: number; q75: number }): number {
  if (percent < Math.min(1, qs.q25 * 0.25)) return 1;
  if (percent < qs.q25) return percent < qs.q25 * 0.67 ? 2 : 3;
  if (percent < qs.q50) return percent < (qs.q25 + qs.q50) / 2 ? 4 : 5;
  if (percent < qs.q75) return percent < (qs.q50 + qs.q75) / 2 ? 6 : 7;
  const span = Math.max(1, percent - qs.q75);
  if (span < qs.q75 * 0.25) return 8;
  if (span < qs.q75 * 0.75) return 9;
  return 10;
}

function filterByPeriod(history: HistoryPoint[], period?: string) {
  if (!period) return history;
  const now = new Date();
  let from: Date;
  if (period === "24h") from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  else if (period === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (period === "365d") from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  else return history;
  return history.filter(h => {
    const d = new Date(h.day + "T00:00:00");
    return d >= from && d <= now;
  });
}

export default function SparklineMini({ history, period = "365d", width = 220, height = 60 }: Props) {
  const chartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Biztonság: ha csak 1 pont van, duplikáljuk
  let safeHistory = history ?? [];
  if (safeHistory.length === 1) {
    const only = safeHistory[0];
    safeHistory = [
      { day: only.day, freq: only.freq },
      { day: only.day, freq: only.freq }
    ];
  }

  const filtered = filterByPeriod(safeHistory, period);
  const labels = filtered.map(h => new Date(h.day + "T00:00:00").toLocaleDateString("hu-HU"));
  const values = filtered.map(h => h.freq);

  const percents = computeSegmentPercents(values);
  const sorted = [...percents].sort((a, b) => a - b);
  const q25 = quantile(sorted, 0.25);
  const q50 = quantile(sorted, 0.5);
  const q75 = quantile(sorted, 0.75);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) => {
            const i = ctx.p0DataIndex;
            const prev = values[i];
            const next = values[i + 1];
            if (typeof prev !== "number" || typeof next !== "number") return "#9CA3AF";
            const percent = Math.abs(((Math.max(0, next) - Math.max(1, prev)) / Math.max(1, prev)) * 100);
            const index = getAdaptiveIndex(percent, { q25, q50, q75 });
            return getIndexColor(index);
          },
          borderWidth: 2
        }
      }
    ]
  };

  const options: ChartOptions<"line"> = {
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    events: [],
    scales: { x: { display: false }, y: { display: false } },
    elements: { point: { radius: 0 } },
    animation: false,
    responsive: false,
    maintainAspectRatio: false
  };

  // Kényszerített canvas méretezés és chart update
  useEffect(() => {
    const container = containerRef.current;
    const chart = chartRef.current;
    if (!container) return;

    // explicit container méret (ha kell, itt is beállítható)
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.overflow = "hidden";

    // ha van chart instance, állítsuk be a canvas attribútumokat és frissítsük
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      // set attributes (ez a kulcs: canvas width/height attribútumok)
      canvas.width = width;
      canvas.height = height;
      // inline style is OK, de a canvas attribútum a fontos
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // ha van chart instance, kényszerítjük a resize/update-et
      if (chart && typeof chart.resize === "function") {
        try {
          chart.resize();
          chart.update();
        } catch {
          // ignore
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, labels.length]); // labels.length változásakor is frissítünk

  // Render: a Line komponens ref-jét elkapjuk, hogy chartRef legyen
  return (
    <div ref={containerRef} style={{ display: "inline-block", width: `${width}px`, height: `${height}px` }}>
      <Line
        ref={(instance) => {
          // react-chartjs-2 v4: instance lehet null vagy Chart
          if (instance && "chartInstance" in instance) {
            // régebbi wrapper esetén
            // @ts-ignore
            chartRef.current = instance.chartInstance;
          } else {
            // modern: instance maga a Chart
            // @ts-ignore
            chartRef.current = instance as unknown as Chart | null;
          }
        }}
        data={data}
        options={options}
        width={width}
        height={height}
      />
    </div>
  );
}
