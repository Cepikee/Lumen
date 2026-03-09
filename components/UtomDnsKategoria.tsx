"use client";

import useSWR from "swr";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Chart,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const sliceLabelPlugin = {
  id: "sliceLabelPlugin",
  afterDraw(chart: Chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    ctx.save();
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((arc: any, index: number) => {
      const value = dataset.data[index] as number;
      if (!value) return;

      const pos = arc.tooltipPosition();
      ctx.fillStyle = "#000";
      ctx.fillText(String(value), pos.x, pos.y);
    });

    ctx.restore();
  },
};

const fetcher = (url: string): Promise<any> =>
  fetch(url, {
    headers: {
      "x-api-key": String(process.env.NEXT_PUBLIC_UTOM_API_KEY),
    } as HeadersInit,
  }).then((r) => r.json());

interface UtomDnsKategoriaProps {
  domain: string;
}

export default function UtomDnsKategoria({ domain }: UtomDnsKategoriaProps) {
  const { data, error } = useSWR(
    domain
      ? `/api/insights/source-category-distribution?domain=${domain}`
      : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true }
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
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#6366f1",
  ];

  if (!domain) return <div>Válassz egy domaint fent.</div>;
  if (loading) return <div>Betöltés…</div>;
  if (error || !data?.success || !data.items.length)
    return <div>Nincs adat ehhez a domainhez.</div>;

  const item = data.items[0];
  const values = categories.map((c) => Number(item[c] ?? 0));

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "40px",
        padding: "10px",
      }}
    >
      {/* BAL OLDAL – CHART + TITLE */}
      <div style={{ textAlign: "center" }}>
        <h2 style={{ marginBottom: "12px" }}>{domain}</h2>

        <div style={{ width: "210px", height: "210px" }}>
          <Doughnut
            data={chartData}
            options={{
              cutout: "70%",
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      typeof ctx.raw === "number" && ctx.raw > 0
                        ? `${ctx.label}: ${ctx.raw}`
                        : "",
                  },
                },
              },
              maintainAspectRatio: false,
            }}
            plugins={[sliceLabelPlugin]}
          />
        </div>
      </div>

      {/* JOBB OLDAL – LEGENDA FÜGGŐLEGESEN */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {categories.map((cat, i) => (
          <div
            key={cat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: categoryColors[i],
                border: "1px solid #000",
              }}
            />
            <span>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
