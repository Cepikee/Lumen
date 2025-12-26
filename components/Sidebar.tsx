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
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onViewModeChange: (mode: string) => void;
  onTodayFilter: () => void;
  onReset: () => void;
  onSourceFilterChange: (sources: string[]) => void;
  activeFilterState: ActiveFilterState;
}

export default function Sidebar({
  isOpen,
  onClose,
  onViewModeChange,
  onTodayFilter,
  onReset,
  onSourceFilterChange,
  activeFilterState
}: SidebarProps) {
  const { viewMode, isTodayMode, sourceFilters = [], availableSources = [] } = activeFilterState || {};

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

          <button
            className="btn btn-sm btn-secondary w-100 mb-2"
            onClick={onTodayFilter}
          >
            🗓️ Mi történt ma?
          </button>

          {(isTodayMode || (sourceFilters && sourceFilters.length > 0)) && (
            <button
              className="btn btn-sm btn-outline-secondary w-100 mb-3"
              onClick={onReset}
            >
              🔄 Összes hír
            </button>
          )}

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
        </nav>
      </aside>
    </>
  );
}
