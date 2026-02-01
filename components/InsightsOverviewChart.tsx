"use client";

import { useEffect, useRef } from "react";

type Point = { date: string; count: number };
type CategorySeries = { category: string; points: Point[] };

export default function InsightsOverviewChart({
  data,
  height = 220,
}: {
  data: CategorySeries[];
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // --- Színpaletta kategóriákhoz ---
    const palette = [
      "#ff6b6b", // piros
      "#4dabf7", // kék
      "#ffd166", // sárga
      "#06d6a0", // zöld
      "#9b5de5", // lila
    ];

    // --- Globális min/max ---
    let globalMax = 1;
    let globalMin = 0;

    for (const cat of data) {
      for (const p of cat.points) {
        if (p.count > globalMax) globalMax = p.count;
      }
    }

    const padding = 12;
    const innerH = height - padding * 2;
    const innerW = width - padding * 2;

    const toY = (v: number) => {
      if (globalMax === globalMin) return height / 2;
      const ratio = (v - globalMin) / (globalMax - globalMin);
      return height - padding - ratio * innerH;
    };

    // --- Minden kategória kirajzolása ---
    data.forEach((cat, idx) => {
      const color = palette[idx % palette.length];
      const points = cat.points;

      if (!points || points.length === 0) return;

      const stepX = innerW / Math.max(points.length - 1, 1);

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      points.forEach((p, i) => {
        const x = padding + i * stepX;
        const y = toY(p.count);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    });
  }, [data, height]);

  return (
    <div style={{ width: "100%", height }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
