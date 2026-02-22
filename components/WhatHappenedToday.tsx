"use client";

import WhatHappenedTodayHeatmap from "./WhatHappenedTodayHeatmap";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import WhatHappenedTodaySpikeDetection from "./WhatHappenedTodaySpikeDetection";
import WhatHappenedTodayKulcsszavak from "./WhatHappenedTodayKulcsszavak";

export default function WhatHappenedToday() {
  return (
    <div className="container my-5 d-flex justify-content-center">

      {/* KÖZÖS DOBOZ */}
      <div className="wht-wrapper-box p-4">

        {/* DOBOZ FEJLÉC */}
        <div className="wht-header text-center mb-4">
          <h2 className="wht-title d-inline-block px-3">
            Mi történt ma valójában?
          </h2>
        </div>

        {/* 4 MODUL GRID */}
        <div className="row g-4">

          <div className="col-12 col-md-6 col-lg-3">
            <div className="wht-box module-box">
              <WhatHappenedTodayHeatmap />
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="wht-box module-box">
              <WhatHappenedTodaySourceActivity />
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="wht-box module-box">
              <WhatHappenedTodaySpikeDetection />
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="wht-box module-box">
              <WhatHappenedTodayKulcsszavak />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
