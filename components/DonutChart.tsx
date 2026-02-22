"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export type DonutChartProps = {
  sources: { name: string; percent: number }[];
  isDark?: boolean;   // ⭐ HOZZÁADVA
};

export default function DonutChart({ sources, isDark = false }: DonutChartProps) {
  const labels = sources.map(s => s.name);
  const dataValues = sources.map(s => s.percent);

  const colors = [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ab"
  ];

  return (
    <div style={{ width: 96, height: 96 }}>
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: dataValues,
              backgroundColor: colors.slice(0, dataValues.length),
              borderWidth: 0,
            },
          ],
        }}
        options={{
          cutout: "60%",
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? "#222" : "#fff",   // ⭐ DARK MODE
              titleColor: isDark ? "#fff" : "#000",
              bodyColor: isDark ? "#ddd" : "#333",
              borderColor: isDark ? "#444" : "#ccc",
              borderWidth: 1,
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.raw}%`,
              },
            },
          },
        }}
      />
    </div>
  );
}
