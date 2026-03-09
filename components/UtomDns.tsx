"use client";

import React, { useState } from "react";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  return (
    <div className="w-screen h-screen bg-[#071226] flex flex-col overflow-hidden">
      <div className="flex-1 p-4 box-border">
        <div className="grid grid-cols-12 gap-4 h-full">

          {/* BAL OLDAL – DOMAIN VÁLASZTÓ + CHART */}
          <aside className="col-span-3 bg-[#0b1220] border border-white/10 rounded-md p-4 text-[12px] text-slate-200 flex flex-col gap-4">

            {/* DOMAIN VÁLASZTÓ */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-300 text-sm">Válassz domaint:</label>

              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="bg-[#071826] border border-white/10 rounded p-2 text-sm"
              >
                <option value="">-- válassz --</option>
                <option value="444.hu">444.hu</option>
                <option value="origo.hu">origo.hu</option>
                <option value="telex.hu">telex.hu</option>
                <option value="index.hu">index.hu</option>
              </select>
            </div>

            {/* CHART */}
            <div>
              <UtomDnsKategoria domain={domain} />
            </div>

          </aside>

          {/* JOBB OLDAL – ÜRES (később tölthető) */}
          <main className="col-span-9 bg-[#0b1220] border border-white/10 rounded-md p-4 text-slate-200">
            <div className="text-slate-400 text-sm">
              Itt majd jönnek a további DNS modulok.
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
