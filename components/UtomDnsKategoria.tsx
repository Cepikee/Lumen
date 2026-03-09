"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function UtomDnsKategoria({ domain }: { domain: string }) {
  const theme = useUserStore((s) => s.theme);

  useEffect(() => {
    // debug mount
    // console.debug("UtomDnsKategoria mounted");
    return () => {
      // console.debug("UtomDnsKategoria unmounted");
    };
  }, []);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data, error } = useSWR(
    domain ? `/api/insights/source-category-distribution?domain=${domain}` : null,
    fetcher,
    { refreshInterval: 60000 }
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

  if (!domain) return null;
  if (loading) return <div className="p-6 text-center text-slate-300">Betöltés…</div>;
  if (error || !data?.success || !data.items.length)
    return <div className="p-6 text-center text-red-500">Nincs adat ehhez a domainhez.</div>;

  const item = data.items[0];
  const values = categories.map((c) => Number(item[c] ?? 0));

  const series = values;
  const labels = categories;

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
      animations: { enabled: true },
      foreColor: isDark ? "#e6eef8" : "#0b1220",
      background: "transparent",
    },
    labels,
    colors: categoryColors,
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: any) => {
        const idx = opts.seriesIndex ?? 0;
        const raw = opts.w?.config?.series?.[opts.seriesIndex] ?? val;
        return Number(raw) > 0 ? String(raw) : "";
      },
      style: {
        colors: ["#000"],
        fontSize: "12px",
        fontWeight: "700",
      },
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: {
              show: false,
            },
            value: {
              show: false,
            },
            total: {
              show: false,
            },
          },
        },
      },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
    stroke: { show: false },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { width: 200 },
        },
      },
    ],
  };

  return (
    <div className="w-full">
      {/* Fejléc: domain név */}
      <div className="flex items-center justify-center mb-4">
        <h2 className="text-2xl font-semibold text-white">{domain}</h2>
      </div>

      {/* Chart + legenda sorban (mobilon egymás alatt) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* Chart doboz */}
        <div className="w-[300px] h-[300px]">
          <Chart options={options} series={series} type="donut" height={300} />
        </div>

        {/* Vízszintes legenda — egymás mellett, jól látható mintákkal */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {categories.map((cat, i) => (
              <div key={cat} className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className="inline-block w-6 h-6 rounded-sm border-2 border-white shadow"
                  style={{ backgroundColor: categoryColors[i] }}
                  aria-hidden
                />
                <span className="text-sm text-slate-200">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
