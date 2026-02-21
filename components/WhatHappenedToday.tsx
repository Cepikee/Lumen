"use client";

import WhatHappenedTodayHeatmap from "./WhatHappenedTodayHeatmap";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import WhatHappenedTodaySpikeDetection from "./WhatHappenedTodaySpikeDetection";
import WhatHappenedTodayKulcsszavak from "./WhatHappenedTodayKulcsszavak";

export default function WhatHappenedToday() {
  return (
    <div className="wht-wrapper container my-5">

      {/* FŐ CÍM BLOKK */}
      <div className="wht-header position-relative mb-4">
        <div className="wht-header-line"></div>
        <h2 className="wht-title position-relative d-inline-block px-3">
          Mi történt ma valójában?
        </h2>
      </div>

      {/* 4 MODUL GRID */}
      <div className="row g-4">

        <div className="col-12 col-md-6 col-lg-3">
          <div className="wht-box p-3 h-100">
            <WhatHappenedTodayHeatmap />
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="wht-box p-3 h-100">
            <WhatHappenedTodaySourceActivity />
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="wht-box p-3 h-100">
            <WhatHappenedTodaySpikeDetection />
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="wht-box p-3 h-100">
            <WhatHappenedTodayKulcsszavak />
          </div>
        </div>

      </div>
    </div>
  );
}
