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

  // --- Datasetek generálása ---
  const datasets = categories.map((cat, idx) => ({
    label: cat,
    data: hours.map((h) => matrix[cat]?.[h] ?? 0),
    backgroundColor: `hsl(${(idx * 60) % 360}, 70%, 55%)`,
  }));

  const chartData = {
    labels: hours.map((h) => `${h}:00`),
    datasets,
  };

  const options = {
    responsive: true,
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
        stacked: false,
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="wht-heatmap">
      <h5 className="mb-3">Kategóriák aktivitása óránként</h5>

      <Bar data={chartData} options={options} />
    </div>
  );
}
