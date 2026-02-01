"use client";

import { useEffect, useRef } from "react";

type Point = {
  date: string;
  count: number;
};

export default function InsightLineChart({
  points,
  height = 160,
  color = "#4da3ff",
}: {
  points: Point[];
  height?: number;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!points || points.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const h = height;

    canvas.width = width * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, h);

    // Extract values
    const values = points.map((p) => p.count);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);

    const padding = 8;
    const innerH = h - padding * 2;
    const innerW = width - padding * 2;

    // Convert point index → X coordinate
    const stepX = innerW / Math.max(points.length - 1, 1);

    const toY = (v: number) => {
      if (max === min) return h / 2;
      const ratio = (v - min) / (max - min);
      return h - padding - ratio * innerH;
    };

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();

    points.forEach((p, i) => {
      const x = padding + i * stepX;
      const y = toY(p.count);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [points, height, color]);

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
