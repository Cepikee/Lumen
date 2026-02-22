"use client";

import WhatHappenedTodayHeatmap from "./WhatHappenedTodayHeatmap";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import WhatHappenedTodaySpikeDetection from "./WhatHappenedTodaySpikeDetection";
import WhatHappenedTodayKulcsszavak from "./WhatHappenedTodayKulcsszavak";

export default function WhatHappenedToday() {
  return (
    <div className="container my-5 d-flex justify-content-center">

      {/* NAGY DOBOZ */}
      <div className="wht-wrapper-box p-4">

        {/* CÍM */}
        <div className="wht-header text-center mb-5">
          <h2 className="wht-title d-inline-block px-3">
            Mi történt ma valójában?
          </h2>
        </div>

        {/* EGY SOR – 3 BLOKK EGYMÁS MELLETT */}
        <div className="row g-4">

          {/* BAL BLOKK – KATEGÓRIÁK */}
          <div className="col-12 col-lg-4">
            <div className="wht-box module-box">
              <WhatHappenedTodayHeatmap />
            </div>
          </div>

          {/* KÖZÉPSŐ BLOKK – FORRÁSOK */}
          <div className="col-12 col-lg-4">
            <div className="wht-box module-box">
              <WhatHappenedTodaySourceActivity />
            </div>
          </div>

          {/* JOBB BLOKK – KÉT ELEM EGY OSZLOPBAN (A JOBB OLDALON A TARTALOM VÍZSZINTESEN JELENIK MEG) */}
          <div className="col-12 col-lg-4 d-flex flex-column gap-4">

            {/* FENT – KIUGRÓ AKTIVITÁSOK (VÍZSZINTES LISTA) */}
            <div className="wht-box module-box horizontal-box">
              <WhatHappenedTodaySpikeDetection />
            </div>

            {/* LENT – FELKAPOTT KULCSSZAVAK (VÍZSZINTES LISTA) */}
            <div className="wht-box module-box horizontal-box">
              <WhatHappenedTodayKulcsszavak />
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
