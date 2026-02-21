"use client";

import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface HeatmapResponse {
  success: boolean;
  categories: string[];
  hours: number[];
  matrix: Record<string, Record<number, number>>;
}

export default function WhatHappenedTodayHeatmap() {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/heatmap");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Bar chart fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="text-danger">
        Nem sikerült betölteni az adatokat.
      </div>
    );
  }

  const { categories, hours, matrix } = data;

  // Fix sorrend
  const orderedCategories = [
    "Politika",
    "Gazdaság",
    "Közélet",
    "Kultúra",
    "Egészségügy",
    "Oktatás",
  ].filter((c) => categories.includes(c));

  // Fix színek
  const colors: Record<string, string> = {
    Politika: "#d81b60",
    Gazdaság: "#f9a825",
    Közélet: "#43a047",
    Kultúra: "#00acc1",
    Egészségügy: "#e53935",
    Oktatás: "#3949ab",
  };

  // Datasetek (stacked)
  const datasets = orderedCategories.map((cat) => ({
    label: cat,
    data: hours.map((h) => matrix[cat]?.[h] ?? 0),
    backgroundColor: colors[cat],
    borderWidth: 0,
  }));

  const chartData = {
    labels: hours.map((h) => `${h}:00`),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw} cikk`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <div className="wht-heatmap" style={{ height: "350px" }}>
      <h5 className="mb-3">Kategóriák aktivitása óránként</h5>

      <Bar data={chartData} options={options} />
    </div>
  );
}
