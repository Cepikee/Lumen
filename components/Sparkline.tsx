"use client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";
import type { ChartOptions } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

type HistoryPoint = { day: string; freq: number };

export default function Sparkline({ history }: { history: HistoryPoint[] }) {
  const safeHistory = (Array.isArray(history) ? history : []).filter((point) => {
    if (!point || typeof point.day !== "string" || Number.isNaN(new Date(`${point.day}T00:00:00`).getTime())) return false;
    const value = Number(point.freq);
    return Number.isFinite(value) && value >= 0;
  });
  const data = {
    labels: safeHistory.map(h => h.day),
    datasets: [
      {
        data: safeHistory.map(h => Number(h.freq)),
        borderColor: "#4CAF50",
        fill: false,
        tension: 0.3
      }
    ]
  };

  const options: ChartOptions<"line"> = {
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
    elements: { point: { radius: 0 } },
    animation: false,
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Line data={data} options={options} />
    </div>
  );
}
