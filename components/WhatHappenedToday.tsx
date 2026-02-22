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

        {/* CÍM */}
        <div className="wht-header text-center mb-5">
          <h2 className="wht-title d-inline-block px-3">
            Mi történt ma valójában?
          </h2>
        </div>

        {/* 1. SOR: KATEGÓRIÁK + KIUGRÓ AKTIVITÁSOK */}
        <div className="row g-4 mb-4">

          <div className="col-12 col-lg-6">
            <div className="wht-box module-box">
              <WhatHappenedTodayHeatmap />
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="wht-box module-box">
              <WhatHappenedTodaySpikeDetection />
            </div>
          </div>

        </div>

        {/* 2. SOR: FORRÁSOK + KULCSSZAVAK */}
        <div className="row g-4">

          <div className="col-12 col-lg-6">
            <div className="wht-box module-box">
              <WhatHappenedTodaySourceActivity />
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="wht-box module-box">
              <WhatHappenedTodayKulcsszavak />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
