"use client";

import { useEffect, useRef } from "react";

export type InsightSparklineProps = {
  trend?: number[]; // preferált
  data?: number[];  // alias
  height?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

export default function InsightSparkline({
  trend,
  data,
  height = 40,
  className = "",
  "aria-hidden": ariaHidden,
}: InsightSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const values = Array.isArray(trend) && trend.length > 0 ? trend : Array.isArray(data) ? data : [];

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 200;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (values.length === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = 4;
    const innerW = Math.max(1, w - pad * 2);
    const innerH = Math.max(1, h - pad * 2);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4dabf7";
    ctx.beginPath();

    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1 || 1)) * innerW;
      const y = pad + (1 - (v - min) / range) * innerH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#4dabf7";
    ctx.lineTo(pad + innerW, pad + innerH);
    ctx.lineTo(pad, pad + innerH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [trend, data, height]);

  return (
    <div className={`insight-sparkline ${className}`} style={{ width: "100%" }} aria-hidden={ariaHidden ?? true}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
    </div>
  );
}
