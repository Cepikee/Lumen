"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";
import { useUserStore } from "@/store/useUserStore";
import type { ApexOptions } from "apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CategoryItem {
  source: string;
  Politika: number;
  Gazdaság: number;
  Közélet: number;
  Kultúra: number;
  Sport: number;
  Tech: number;
  Egészségügy: number;
  Oktatás: number;
}

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function WSourceCategoryDistribution() {
  // --- THEME (pont úgy, ahogy te használod) ---
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // --- API ---
  const { data, error, isLoading } = useSWR<{ success: boolean; items: CategoryItem[] }>(
    "/api/insights/source-category-distribution",
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success || !Array.isArray(data.items)) {
    return (
      <div className="p-4 text-red-500">
        Nem sikerült betölteni a kategóriaeloszlást.
      </div>
    );
  }

  const items = data.items;

  if (!items.length) {
    return (
      <div className="p-4 text-gray-500">
        Nincs elég adat a kategóriaeloszláshoz.
      </div>
    );
  }

  // --- Kategóriák sorrendje ---
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

  // --- Sorozatok (forrásonként) ---
  const series = items.map((src) => ({
    name: src.source,
    data: categories.map((c) => (src as any)[c] ?? 0),
  }));

  // --- Chart opciók ---
  const options: ApexOptions = {
    chart: {
      type: "radar",
      toolbar: { show: false },
      background: "transparent",
    },
    stroke: {
      width: 2,
    },
    fill: {
      opacity: 0.2,
    },
    legend: {
      show: true,
      labels: {
        colors: isDark ? "#fff" : "#000",
      },
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: categories.map(() => (isDark ? "#fff" : "#000")),
          fontSize: "13px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDark ? "#fff" : "#000",
        },
      },
    },
  };

  return (
    <div
      className="p-4 rounded border"
      style={{
        background: isDark ? "#0b1220" : "#fff",
        borderColor: isDark ? "#1e293b" : "#e5e7eb",
        color: isDark ? "#fff" : "#000",
      }}
    >
      <h3 className="text-lg font-semibold mb-4">Kategóriaeloszlás forrásonként</h3>

      <ApexChart
        options={options}
        series={series}
        type="radar"
        height={420}
      />
    </div>
  );
}
