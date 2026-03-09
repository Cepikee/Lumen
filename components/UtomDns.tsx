"use client";

import React, { useState } from "react";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  return (
    <div>
      <div>
        {/* Bal oldalon a chart */}
        <div>
          <UtomDnsKategoria domain={domain} />
        </div>

        {/* Jobb oldalon a részletes profil + domain választó */}
        <aside>
          <div>
            <label>Válassz domaint:</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              <option value="">-- válassz --</option>
              <option value="444.hu">444.hu</option>
              <option value="origo.hu">origo.hu</option>
              <option value="telex.hu">telex.hu</option>
              <option value="index.hu">index.hu</option>
            </select>
          </div>

          <div>
            <h3>Részletes profil</h3>
            <div>Itt jelennek meg a domainhez tartozó részletes információk.</div>

            <div>
              <div>Domain: {domain || "—"}</div>
              <div>Típus: —</div>
              <div>Összes cikk: —</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
