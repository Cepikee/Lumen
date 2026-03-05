"use client";

import { useUserStore } from "@/store/useUserStore";

import WhatHappenedTodayHeatmap from "./WhatHappenedTodayHeatmap";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import WhatHappenedTodaySpikeDetection from "./WhatHappenedTodaySpikeDetection";
import WhatHappenedTodayKulcsszavak from "./WhatHappenedTodayKulcsszavak";

export default function WhatHappenedToday() {
  const theme = useUserStore((s) => s.theme);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div
      className="p-4 rounded border bg-[var(--bs-body-bg)]"
      style={{
        borderColor: isDark ? "#1e293b" : "#e5e7eb",
        color: isDark ? "#fff" : "#000",
      }}
    >
      {/* CÍM */}
      <div className="wht-header text-center mb-5">
        <h2 className="wht-title d-inline-block px-3">
          Mi történt ma valójában?
        </h2>
      </div>

      {/* FŐSOR – 3 OSZLOP */}
      <div className="row g-4">

        {/* BAL OSZLOP */}
        <div className="col-12 col-lg-3">
          <div className="border-0 shadow-none bg-transparent p-0">
            <WhatHappenedTodayHeatmap />
          </div>
        </div>

        {/* KÖZÉPSŐ OSZLOP */}
        <div className="col-12 col-lg-3">
          <div className="border-0 shadow-none bg-transparent p-0">
            <WhatHappenedTodaySourceActivity />
          </div>
        </div>

        {/* JOBB OSZLOP */}
        <div className="col-12 col-lg-6 d-flex flex-column gap-4">

          <div className="horizontal-list bg-transparent border-0 shadow-none p-0 m-0">
            <WhatHappenedTodaySpikeDetection />
          </div>

          <div className="horizontal-list border-0 shadow-none bg-transparent p-0 overflow-hidden">
            <div className="px-3 py-2">
              <WhatHappenedTodayKulcsszavak />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
