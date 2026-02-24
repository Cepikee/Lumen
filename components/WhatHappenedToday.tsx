"use client";

import WhatHappenedTodayHeatmap from "./WhatHappenedTodayHeatmap";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import WhatHappenedTodaySpikeDetection from "./WhatHappenedTodaySpikeDetection";
import WhatHappenedTodayKulcsszavak from "./WhatHappenedTodayKulcsszavak";

export default function WhatHappenedToday() {
  return (
    // A wrapper most adjon elegendő magasságot az oldalnak (header magasságától függően finomítsd)
    <div className="wht-wrapper-box min-h-[calc(100vh-120px)]">
      {/* CÍM */}
      <div className="wht-header text-center mb-5">
        <h2 className="wht-title d-inline-block px-3">
          Mi történt ma valójában?
        </h2>
      </div>

      {/* FŐSOR – 3 OSZLOP; stretch-eljük a sor magasságát */}
      <div className="row g-4 items-stretch h-full">

        {/* BAL OSZLOP – 3 */}
        <div className="col-12 col-lg-3 d-flex flex-column gap-4 h-full">
          <div className="wht-box module-box p-0">
            <WhatHappenedTodayHeatmap />
          </div>

          <div className="wht-box module-box p-0">
            <WhatHappenedTodaySourceActivity />
          </div>
        </div>

        {/* KÖZÉPSŐ OSZLOP – 3 */}
        <div className="col-12 col-lg-3 d-flex flex-column gap-4 h-full">
          <div className="wht-box module-box p-0">
            <WhatHappenedTodaySpikeDetection />
          </div>
        </div>

        {/* JOBB OSZLOP – 6: itt a fontos rész */}
        <div className="col-12 col-lg-6 d-flex flex-column gap-4 h-full">
          {/* FENT – KIUGRÓ AKTIVITÁSOK (fix magasságú doboz) */}
          <div className="wht-box module-box p-0 flex-none">
            <div className="p-3">
              <WhatHappenedTodaySpikeDetection />
            </div>
          </div>

          {/* LENT – KULCSSZAVAK (EZ LESZ A GÖRGETHETŐ, KITÖLTŐ DOBOZ) */}
          <div className="wht-box module-box p-0 flex-1 overflow-hidden">
            {/* belső wrapper, ami görgethető */}
            <div className="h-full overflow-y-auto p-3">
              <WhatHappenedTodayKulcsszavak />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
