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

        {/* FŐ SOR – 2 OSZLOP */}
        <div className="row g-4">

          {/* BAL OSZLOP */}
          <div className="col-12 col-lg-6 d-flex flex-column gap-4">

            <div className="wht-box module-box">
              <WhatHappenedTodayHeatmap />
            </div>

            <div className="wht-box module-box">
              <WhatHappenedTodaySpikeDetection />
            </div>

          </div>

          {/* JOBB OSZLOP */}
          <div className="col-12 col-lg-6 d-flex flex-column gap-4">

            <div className="wht-box module-box">
              <WhatHappenedTodaySourceActivity />
            </div>

            <div className="wht-box module-box">
              <WhatHappenedTodayKulcsszavak />
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
