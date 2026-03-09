"use client";

import useSWR from "swr";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

// LABEL PLUGIN
const sliceLabelPlugin = {
  id: "sliceLabelPlugin",
  afterDraw(chart: any) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc: any, index: number) => {
      const value = dataset.data[index];
      if (!value) return;

      const pos = arc.tooltipPosition();
      ctx.fillStyle = "#000";
      ctx.fillText(value, pos.x, pos.y);
    });

    ctx.restore();
  },
};

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function UtomDnsKategoria({ domain }: { domain: string }) {
  const { data, error, isLoading } = useSWR(
    domain
      ? `/api/insights/source-category-distribution?domain=${domain}`
      : null,
    fetcher
  );

  const categories = [
    "Politika",
    "Gazdaság",
    "Közélet",
    "Kultúra",
    "Sport",
    "Tech",
    "Egészségügy",
    "Oktatás",
  ];

  const categoryColors = [
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#6366f1",
  ];

  if (!domain) {
    return <div className="text-slate-400 text-sm">Válassz domaint.</div>;
  }

  if (isLoading) {
    return <div className="text-slate-400 text-sm">Betöltés...</div>;
  }

  if (error || !data?.success || !data.items.length) {
    return <div className="text-red-500 text-sm">Nincs adat ehhez a domainhez.</div>;
  }

  const item = data.items[0];
  const values = categories.map((c) => item[c] ?? 0);

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: values,
        backgroundColor: categoryColors,
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">

      {/* DOMAIN NÉV NAGYBAN */}
      <h2 className="text-xl font-bold text-white text-center">
        {domain}
      </h2>

      {/* CHART */}
      <div className="w-[220px] h-[220px]">
        <Doughnut
          data={chartData}
          options={{
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) =>
                    ctx.raw > 0 ? `${ctx.label}: ${ctx.raw}` : "",
                },
              },
            },
          }}
          plugins={[sliceLabelPlugin]}
        />
      </div>

      {/* LEGENDA – 1 soros, vízszintes, jól látható */}
<div className="flex flex-wrap justify-center gap-4 text-sm text-slate-300 mt-2">
  {categories.map((cat, i) => (
    <div key={cat} className="flex items-center gap-2">
      <span
        className="inline-block w-4 h-4 rounded-sm border border-white/40"
        style={{ backgroundColor: categoryColors[i] }}
      ></span>
      <span>{cat}</span>
    </div>
  ))}
</div>



    </div>
  );
}
