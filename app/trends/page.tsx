"use client";

import { useState } from "react";
import TrendsFilters from "@/components/TrendsFilters";
import TrendsList from "@/components/TrendsList";

type Filters = {
  period: string;
  sources: string[];
  categories: string[];
  sort: string;
  keyword: string;
};

export default function TrendsPage() {
  const [filters, setFilters] = useState<Filters>({
    period: "7d",
    sources: [],
    categories: [],
    sort: "freq",
    keyword: "",
  });

  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);

  return (
    <div className="container-fluid px-0">
      <div className="row g-0" style={{ minHeight: "100vh" }}>
        <aside
          className="border-end"
          style={{ width: "220px", paddingLeft: "24px", paddingRight: "24px" }}
        >
          <h2 className="fs-5 mt-4 mb-3">🎛 Szűrés</h2>
          <TrendsFilters filters={filters} setFilters={setFilters} />
        </aside>

        <section className="col-md-9 ps-4">
          <div className="mt-4 mb-3 d-flex justify-content-between align-items-center">
            <h1 className="fs-3 fw-bold">🔥 Trendek</h1>
            <span className="text-muted">Összes találat: {/* ha később lesz trends tömb, ide szám */}</span>
          </div>

          {/* Ha a TrendsList jelenleg csak a filters propot várja, így hívd meg */}
          <TrendsList filters={filters} />


        </section>
      </div>
    </div>
  );
}
