"use client";

import React, { useState } from "react";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  return (
    <div className="min-h-screen w-full bg-[#071226] text-white p-6">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">

        {/* BAL: Chart */}
        <div className="flex-1 flex justify-center items-start">
          <UtomDnsKategoria domain={domain} />
        </div>

        {/* JOBB: Részletes profil (választó a tetején) */}
        <aside className="w-full lg:w-96 flex flex-col gap-4">
          {/* Domain választó — marad a profil tetején */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Válassz domaint:</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-transparent border border-white/20 rounded p-2 text-sm text-white"
            >
              <option value="">-- válassz --</option>
              <option value="444.hu">444.hu</option>
              <option value="origo.hu">origo.hu</option>
              <option value="telex.hu">telex.hu</option>
              <option value="index.hu">index.hu</option>
            </select>
          </div>

          {/* Részletes profil — dobozok nélkül, egyszerű mezők */}
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Részletes profil</h3>
            <div className="text-sm text-slate-300">
              Itt jelennek meg a domainhez tartozó részletes információk.
            </div>

            <div className="mt-2 text-sm text-slate-200 space-y-1">
              <div><span className="text-slate-400">Domain:</span> {domain || "—"}</div>
              <div><span className="text-slate-400">Típus:</span> —</div>
              <div><span className="text-slate-400">Összes cikk:</span> —</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
