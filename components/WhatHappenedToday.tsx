"use client";

import WhatHappenedTodayHeatmap from "./WhatHappenedTodayHeatmap";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import WhatHappenedTodaySpikeDetection from "./WhatHappenedTodaySpikeDetection";
import WhatHappenedTodayKulcsszavak from "./WhatHappenedTodayKulcsszavak";

export default function WhatHappenedToday() {
  return (
    <div className="wht-wrapper-box">

      {/* CÍM */}
      <div className="wht-header text-center mb-5">
        <h2 className="wht-title d-inline-block px-3">
          Mi történt ma valójában?
        </h2>
      </div>

      {/* FŐSOR – 3 OSZLOP */}
      <div className="row g-4">

        {/* BAL OSZLOP – kisebb: 3 */}
        <div className="col-12 col-lg-3">
          <div className="wht-box module-box">
            <WhatHappenedTodayHeatmap />
          </div>
        </div>

        {/* KÖZÉPSŐ OSZLOP – kisebb: 3 */}
        <div className="col-12 col-lg-3">
          <div className="wht-box module-box">
            <WhatHappenedTodaySourceActivity />
          </div>
        </div>

        {/* JOBB OSZLOP – nagyobb: 6 */}
        <div className="col-12 col-lg-6 d-flex flex-column gap-4">

          {/* FENT – KIUGRÓ AKTIVITÁSOK (VÍZSZINTES) */}
          <div className="wht-box module-box horizontal-list">
            <WhatHappenedTodaySpikeDetection />
          </div>

          {/* LENT – KULCSSZAVAK (VÍZSZINTES) */}
          <div className="wht-box module-box horizontal-list">
            <WhatHappenedTodayKulcsszavak />
          </div>

        </div>

      </div>
    </div>
  );
}
