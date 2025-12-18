"use client";

import React from "react";
import CategoryHeatMap from "./CategoryHeatMap"; // 🔹 ha kell, használható

import TrendsDebug from "./TrendsDebug";
// 🔹 Exportáljuk az interface-t, hogy máshol is használható legyen
export interface Filters {
  period: string;
  sources: string[];
  categories: string[];
  sort: string;
  keyword: string;
  startDate?: string;
  endDate?: string;
}

interface Props {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

export default function TrendsFilters({ filters, setFilters }: Props) {
  const allSources = ["Telex", "444", "Index"];
  const allCategories = [
  "Politika",
  "Sport",
  "Gazdaság",
  "Tech",
  "Kultúra",
  "Egészségügy",
  "Oktatás",
  "Közélet",
];


  const isAllSources = filters.sources.length === 0;

  return (
    <form className="d-flex flex-column gap-3 px-0 mx-0">
      {/* Időszak */}
      <div className="m-0 p-0">
        <label className="form-label fw-bold">⏱ Időszak</label>
        <select
          className="form-select"
          value={filters.period}
          onChange={(e) => setFilters({ ...filters, period: e.target.value })}
        >
          <option value="24h">24 óra</option>
          <option value="7d">7 nap</option>
          <option value="30d">30 nap</option>
          <option value="365d">Utolsó 365 nap (idei év)</option>
          <option value="custom">Egyedi</option>
        </select>

        {filters.period === "custom" && (
          <div className="d-flex align-items-center gap-2 mt-2">
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={filters.startDate || ""}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
            <span>–</span>
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={filters.endDate || ""}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
          </div>
        )}
      </div>

      {/* Források */}
      <div className="m-0 p-0">
        <label className="form-label fw-bold">📰 Források</label>
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            checked={isAllSources}
            onChange={() => setFilters({ ...filters, sources: [] })}
          />
          <label className="form-check-label">Mind</label>
        </div>

        {allSources.map((src) => (
          <div key={src} className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              checked={filters.sources.includes(src)}
              onChange={(e) => {
                const newSources = e.target.checked
                  ? [...filters.sources, src]
                  : filters.sources.filter((s) => s !== src);
                setFilters({ ...filters, sources: newSources });
              }}
            />
            <label className="form-check-label">{src}</label>
          </div>
        ))}
      </div>

      {/* Kategóriák */}
      <div className="m-0 p-0">
        <label className="form-label fw-bold">📂 Kategóriák</label>
        {allCategories.map((cat) => {
          const checked = filters.categories.includes(cat);
<TrendsDebug filters={filters} />
          return (
            <div key={cat} className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={checked}
                onChange={(e) => {
                  const newCats = e.target.checked
                    ? [...filters.categories, cat]
                    : filters.categories.filter((c) => c !== cat);
                  setFilters({ ...filters, categories: newCats });
                }}
              />
              <label className="form-check-label">{cat}</label>
            </div>
          );
        })}
      </div>

      {/* Rendezés */}
      <div className="m-0 p-0">
        <label className="form-label fw-bold">⚖ Rendezés</label>
        <select
          className="form-select"
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="freq">Gyakoriság</option>
          <option value="growth">Növekedés</option>
          <option value="relevance">Relevancia</option>
        </select>
      </div>

      {/* Kereső */}
      <div className="m-0 p-0">
        <label className="form-label fw-bold">🔍 Kulcsszó kereső</label>
        <input
          type="text"
          className="form-control"
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          placeholder="Írj be egy kulcsszót..."
        />
      </div>
    </form>
  );
}
