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

const sliceLabelPlugin = {
  id: "sliceLabelPlugin",
  afterDraw(chart: any) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.font = "bold 11px sans-serif";
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
  const { data, error } = useSWR(
    domain ? `/api/insights/source-category-distribution?domain=${domain}` : null,
    fetcher
  );

  const loading = !data && !error;

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
    "#ef4444", // Politika
    "#f59e0b", // Gazdaság
    "#10b981", // Közélet
    "#3b82f6", // Kultúra
    "#8b5cf6", // Sport
    "#ec4899", // Tech
    "#14b8a6", // Egészségügy
    "#6366f1", // Oktatás
  ];

  if (!domain) return <div className="text-slate-300">Válassz domaint a profil panelen.</div>;
  if (loading) return <div className="text-slate-300">Betöltés…</div>;
  if (error || !data?.success || !data.items.length)
    return <div className="text-red-500">Nincs adat ehhez a domainhez.</div>;

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
    <div className="flex flex-col items-center gap-4">
      {/* Domain név a chart felett */}
      <h2 className="text-2xl font-semibold text-white">{domain}</h2>

      {/* Chart */}
      <div className="w-[260px] h-[260px]">
        <Doughnut
          data={chartData}
          options={{
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) => (ctx.raw > 0 ? `${ctx.label}: ${ctx.raw}` : ""),
                },
              },
            },
            maintainAspectRatio: false,
          }}
          plugins={[sliceLabelPlugin]}
        />
      </div>

      {/* Vízszintes legenda — jól látható színmintákkal */}
      <div className="w-full flex justify-center">
        <div className="flex items-center gap-6 flex-wrap">
          {categories.map((cat, i) => (
            <div key={cat} className="flex items-center gap-2">
              <span
                className="inline-block w-5 h-5 rounded-sm border-2 border-white/70 shadow-sm"
                style={{ backgroundColor: categoryColors[i] }}
                aria-hidden
              />
              <span className="text-sm text-slate-200">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
