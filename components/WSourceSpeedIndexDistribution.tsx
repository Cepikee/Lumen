"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceSpeedIndexDistribution({ source }: { source: string }) {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    delays: number[];
  }>(
    `/api/insights/speedindex/distribution?source=${source}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data?.success) {
    return <div className="p-4 text-red-500">Nem sikerült betölteni az eloszlást.</div>;
  }

  const delays = data.delays;

  // --- Bucketek (0-5, 5-10, 10-20, 20-40, 40+) ---
  const buckets = [0, 5, 10, 20, 40];
  const labels = ["0–5", "5–10", "10–20", "20–40", "40+"];

  const counts = [0, 0, 0, 0, 0];

  for (const d of delays) {
    if (d < 5) counts[0]++;
    else if (d < 10) counts[1]++;
    else if (d < 20) counts[2]++;
    else if (d < 40) counts[3]++;
    else counts[4]++;
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: "Cikkek száma",
        data: counts,
        backgroundColor: isDark ? "#3b82f6" : "#2563eb",
      },
    ],
  };

  const options = {
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div
      className={`p-4 rounded border ${
        isDark ? "border-[#1e293b] text-white" : "border-[#e5e7eb] text-black"
      }`}
      style={{ backgroundColor: "var(--bs-body-bg)" }}
    >
      <h3 className="text-lg font-semibold mb-4 text-center">
        Késés-eloszlás: {source}
      </h3>

      <Bar data={chartData} options={options} />
    </div>
  );
}
