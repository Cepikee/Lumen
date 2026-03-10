"use client";

import React from "react";

interface SourceItem {
  id: string | number;
  name: string;
}

interface ActiveFilterState {
  viewMode: string;
  isTodayMode: boolean;
  sourceFilters: string[];
  availableSources: SourceItem[];

  // 🔥 ÚJ: kategória szűrés
  categoryFilters: string[];
  availableCategories: string[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onViewModeChange: (mode: "card" | "compact") => void;
  onTodayFilter: () => void;
  onReset: () => void;
  onSourceFilterChange: (sources: string[]) => void;

  // 🔥 ÚJ: kategória callback
  onCategoryFilterChange: (categories: string[]) => void;

  activeFilterState: ActiveFilterState;
}

export default function Sidebar({
  isOpen,
  onClose,
  onViewModeChange,
  onTodayFilter,
  onReset,
  onSourceFilterChange,
  onCategoryFilterChange,
  activeFilterState
}: SidebarProps) {
  const {
    viewMode,
    isTodayMode,
    sourceFilters = [],
    availableSources = [],

    // 🔥 ÚJ
    categoryFilters = [],
    availableCategories = []
  } = activeFilterState || {};

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: isOpen ? "rgba(0,0,0,0.15)" : "transparent",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
          zIndex: 998,
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "240px",
          height: "100vh",
          background: "var(--bs-body-bg)",
          borderRight: "1px solid rgba(0,0,0,0.1)",
          padding: "80px 16px 16px",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: 999,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <nav>
          <div className="mb-3">
            <div className="fw-bold mb-1">Nézet</div>

            <button
              className="btn btn-sm btn-secondary w-100 mb-1"
              onClick={() => onViewModeChange("card")}
            >
              Kártya nézet
            </button>

            <button
              className="btn btn-sm btn-secondary w-100"
              onClick={() => onViewModeChange("compact")}
            >
              Kompakt nézet
            </button>
          </div>

          {/* --- GOMB LOGIKA JAVÍTVA --- */}
          {sourceFilters.length === 0 ? (
            <button
              className="btn btn-sm btn-secondary w-100 mb-2"
              onClick={onTodayFilter}
            >
              🗓️ Mi történt ma?
            </button>
          ) : (
            <button
              className="btn btn-sm btn-outline-secondary w-100 mb-3"
              onClick={onReset}
            >
              🔄 Összes hír
            </button>
          )}
          {/* --- GOMB LOGIKA VÉGE --- */}

          {/* --- FORRÁSOK --- */}
          <div>
            <div className="fw-bold mb-1">Források</div>

            <div className="form-check mb-1">
              <input
                type="checkbox"
                className="form-check-input"
                checked={sourceFilters.length === 0}
                onChange={() => onSourceFilterChange([])}
              />
              <label className="form-check-label">Mind</label>
            </div>

            {availableSources.map((src: SourceItem) => (
              <div key={src.id} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={sourceFilters.includes(String(src.id))}
                  onChange={(e) => {
                    const newSources = e.target.checked
                      ? [...sourceFilters, String(src.id)]
                      : sourceFilters.filter((s: string) => s !== String(src.id));

                    onSourceFilterChange(newSources);
                  }}
                />
                <label className="form-check-label">{src.name}</label>
              </div>
            ))}
          </div>

          {/* --- KATEGÓRIÁK --- */}
          <div className="mt-4">
            <div className="fw-bold mb-1">Kategóriák</div>

            <div className="form-check mb-1">
              <input
                type="checkbox"
                className="form-check-input"
                checked={categoryFilters.length === 0}
                onChange={() => onCategoryFilterChange([])}
              />
              <label className="form-check-label">Mind</label>
            </div>

            {availableCategories.map((cat: string) => (
              <div key={cat} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={categoryFilters.includes(cat)}
                  onChange={(e) => {
                    const newCats = e.target.checked
                      ? [...categoryFilters, cat]
                      : categoryFilters.filter((c) => c !== cat);

                    onCategoryFilterChange(newCats);
                  }}
                />
                <label className="form-check-label">{cat}</label>
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
