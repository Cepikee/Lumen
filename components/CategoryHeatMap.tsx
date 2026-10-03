"use client";

import React, { useState } from "react";

interface CategoryData {
  name: string;
  strength: number; // 0–100
}

interface Props {
  categories: CategoryData[];
}

export default function CategoryHeatMap({ categories }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 🔹 Trigger gomb a Kategóriák alatt */}
      <button
        type="button"
        className="btn btn-link p-0 mt-2 text-decoration-none heatmap-trigger"
        onClick={() => setOpen(true)}
      >
        Heatmap
      </button>

      {/* 🔹 Modal */}
      {open && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex={-1}
          role="dialog"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Kategória‑heatmap</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                {(Array.isArray(categories) ? categories : []).map((cat) => {
                  const strength = Number(cat?.strength);
                  const opacity = Number.isFinite(strength)
                    ? Math.min(1, Math.max(0, strength / 100))
                    : 0;
                  return (
                  <div
                    key={cat.name}
                    className="d-flex align-items-center mb-1"
                  >
                    <span className="me-2" style={{ width: "80px" }}>
                      {cat.name}
                    </span>
                    <div
                      className="flex-grow-1"
                      style={{
                        height: "12px",
                        backgroundColor: "#A0522D",
                        opacity,
                      }}
                    />
                  </div>
                  );
                })}

                <p className="mt-3">
                  Ez a hőtérkép vizuálisan mutatja, mely kategóriákban volt a
                  legtöbb trend az adott időszakban. A sötétebb szín erősebb
                  aktivitást jelez.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
