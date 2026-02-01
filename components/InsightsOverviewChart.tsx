"use client";

import { useEffect, useRef } from "react";

type Point = { date: string; count: number };
type CategorySeries = { category: string; points: Point[] };

export default function InsightsOverviewChart({
  data,
  height = 300, // nagyobb teljes magasság
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

    // --- Detect theme ---
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const axisColor = isDark ? "#aaa" : "#666";
    const gridColor = isDark ? "#333" : "#eee";
    const textColor = isDark ? "#ddd" : "#444";

    // ÚJ PALETTA – Gazdaság új színnel
    const palette = [
      "#ff6b6b", // Sport
      "#4dabf7", // Politika
      "#ffd166", // Kultúra
      "#06d6a0", // Tech
      "#9b5de5", // Egészségügy
      "#f06595", // Közélet
      "#00c2d1", // Gazdaság (ÚJ, erős türkiz)
      "#ff922b", // Oktatás
    ];

    // --- Global max ---
    let globalMax = 1;
    for (const cat of data) {
      for (const p of cat.points) {
        if (p.count > globalMax) globalMax = p.count;
      }
    }

    // --- Layout ---
    const paddingLeft = 45;
    const paddingBottom = 48; // NAGYOBB alsó padding → dátumok nem lógnak ki
    const paddingTop = 10;
    const paddingRight = 10;

    const innerH = height - paddingTop - paddingBottom;
    const innerW = width - paddingLeft - paddingRight;

    const toY = (v: number) => {
      const ratio = v / globalMax;
      return paddingTop + innerH - ratio * innerH;
    };

    // --- Y axis ---
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, height - paddingBottom);
    ctx.stroke();

    // Y labels + grid
    ctx.fillStyle = textColor;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const value = Math.round((globalMax / ySteps) * i);
      const y = toY(value);

      ctx.fillText(String(value), paddingLeft - 8, y + 4);

      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
    }

    // --- X axis ---
    ctx.strokeStyle = axisColor;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - paddingRight, height - paddingBottom);
    ctx.stroke();

    // X labels (auto thinning)
    ctx.fillStyle = textColor;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    const samplePoints = data[0]?.points || [];
    const stepX = innerW / Math.max(samplePoints.length - 1, 1);

    // Ritkítás: 7 → minden nap, 30 → minden 3., 90 → minden 7.
    let labelEvery = 1;
    if (samplePoints.length > 60) labelEvery = 7;
    else if (samplePoints.length > 20) labelEvery = 3;

    samplePoints.forEach((p, i) => {
      if (i % labelEvery !== 0) return;

      const x = paddingLeft + i * stepX;
      const label = p.date.slice(5); // "MM-DD"
      ctx.fillText(label, x, height - paddingBottom + 20); // FELJEBB húzva
    });

    // --- Lines ---
    data.forEach((cat, idx) => {
      const color = palette[idx % palette.length];
      const points = cat.points;

      if (!points || points.length === 0) return;

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      points.forEach((p, i) => {
        const x = paddingLeft + i * stepX;
        const y = toY(p.count);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    });
  }, [data, height]);

  return (
    <div style={{ width: "100%", height }}>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        {data.map((cat, idx) => {
          const color = [
            "#ff6b6b",
            "#4dabf7",
            "#ffd166",
            "#06d6a0",
            "#9b5de5",
            "#f06595",
            "#00c2d1", // Gazdaság új színe
            "#ff922b",
          ][idx % 8];

          return (
            <div
              key={cat.category}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: color,
                  borderRadius: 3,
                }}
              />
              <span style={{ fontSize: 12 }}>{cat.category}</span>
            </div>
          );
        })}
      </div>

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
