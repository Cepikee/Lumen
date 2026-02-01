"use client";

import { useEffect, useRef } from "react";

type Point = { date: string; count: number };
type CategorySeries = { category: string; points: Point[] };

export default function InsightsOverviewChart({
  data,
  height = 260,
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

    const axisColor = isDark ? "#888" : "#666";
    const gridColor = isDark ? "#333" : "#eee";
    const textColor = isDark ? "#bbb" : "#444";

    const palette = [
      "#ff6b6b",
      "#4dabf7",
      "#ffd166",
      "#06d6a0",
      "#9b5de5",
      "#f06595",
      "#74c0fc",
      "#fcc419",
    ];

    // --- Global max ---
    let globalMax = 1;
    for (const cat of data) {
      for (const p of cat.points) {
        if (p.count > globalMax) globalMax = p.count;
      }
    }

    // --- Layout ---
    const paddingLeft = 40;
    const paddingBottom = 32; // nagyobb, hogy ne lógjon ki
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
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const value = Math.round((globalMax / ySteps) * i);
      const y = toY(value);

      ctx.fillText(String(value), paddingLeft - 6, y + 3);

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
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";

    const samplePoints = data[0]?.points || [];
    const stepX = innerW / Math.max(samplePoints.length - 1, 1);

    // Ha sok nap van (30/90), ritkítjuk a feliratokat
    const labelEvery = samplePoints.length > 60 ? 10 : samplePoints.length > 20 ? 3 : 1;

    samplePoints.forEach((p, i) => {
      if (i % labelEvery !== 0) return;

      const x = paddingLeft + i * stepX;
      const label = p.date.slice(5); // "MM-DD"
      ctx.fillText(label, x, height - 8);
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
            "#74c0fc",
            "#fcc419",
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
