"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SourceItem {
  source: string;
  total: number;
  hours: number[];
}

interface ApiResponse {
  success: boolean;
  sources: SourceItem[];
}

export default function WhatHappenedTodaySourceActivity() {
  const [data, setData] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/source-activity");
        const json: ApiResponse = await res.json();
        if (json.success) {
          setData(json.sources);
        }
      } catch (err) {
        console.error("Source activity fetch error:", err);
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

  if (!data.length) {
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  // Rendezés: legtöbb cikk → legkevesebb
  const sorted = [...data].sort((a, b) => b.total - a.total);

  const series = [
    {
      name: "Cikkek száma",
      data: sorted.map((item) => item.total),
    },
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "60%",
      },
    },
    xaxis: {
      categories: sorted.map((item) => item.source),
      labels: { style: { fontSize: "13px" } },
    },
    colors: ["#ff4d4f"],
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontWeight: 600 },
    },
    grid: { show: false },
    legend: { show: false },
  };

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3 text-center">Források aktivitása ma</h5>
      <ApexChart options={options} series={series} type="bar" height={350} />
    </div>
  );
}
