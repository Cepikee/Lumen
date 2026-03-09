"use client";

import React, { useState } from "react";
import useSWR from "swr";
import UtomDnsKategoria from "@/components/UtomDnsKategoria";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

export default function UtomDns() {
  const [domain, setDomain] = useState("");

  // API hívás csak akkor, ha van domain
 const { data, error, isLoading } = useSWR(
  domain ? `/api/insights/source-category-distribution?domain=${domain}` : null,
  fetcher
);


  return (
    <div className="w-screen h-screen bg-[#071226] flex flex-col overflow-hidden">
      <div className="flex-1 p-4 box-border">
        <div className="grid grid-cols-12 gap-4 h-full">

          {/* BAL OLDAL – DOMAIN VÁLASZTÓ + ADATOK */}
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

            {/* HA NINCS DOMAIN → üres */}
            {!domain && (
              <div className="text-slate-400 text-sm mt-4">
                Válassz egy domaint a bal felső menüből.
              </div>
            )}

            {/* HA VAN DOMAIN → betöltés */}
            {domain && isLoading && (
              <div className="text-slate-400 text-sm mt-4">Betöltés...</div>
            )}

            {/* HA VAN DOMAIN ÉS ADAT */}
            {domain && data?.success && (
              <>
                {/* DOMAIN INFO */}
                <div>
                  <h2 className="text-[14px] font-semibold text-sky-300 mb-1">
                    Domain alapinformációk
                  </h2>

                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="text-slate-400">Domain neve: </span>
                      <span className="font-semibold text-white">{data.domain}</span>
                    </div>

                    <div>
                      <span className="text-slate-400">Típus: </span>
                      <span className="font-semibold text-white">{data.type}</span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-400">Összes cikk száma: </span>
                      <span className="font-semibold text-white">
                        {data.totalArticles.toLocaleString("hu-HU")} db
                      </span>
                    </div>
                  </div>
                </div>

                {/* KATEGÓRIAELOSZLÁS */}
                <div>
                  <h3 className="text-[13px] font-semibold text-slate-100 mb-2">
                    Kategóriaeloszlás
                  </h3>
                  <UtomDnsKategoria domain={domain} />
                </div>
              </>
            )}
          </aside>

          {/* KÖZÉP – TARTALMI ÖSSZKÉP */}
          <main className="col-span-6 bg-[#0b1220] border border-white/10 rounded-md p-4 text-[12px] text-slate-200 overflow-y-auto">

            {!domain && (
              <div className="text-slate-400 text-sm text-center mt-10">
                Válassz domaint a bal oldalon.
              </div>
            )}

            {domain && data?.success && (
              <>
                <h2 className="text-[16px] font-semibold text-center text-sky-300 mb-3">
                  Tartalmi összkép
                </h2>

                <div className="space-y-3">

                  <section>
                    <h3 className="text-[13px] font-semibold text-slate-100 mb-1">
                      Tartalom mennyisége
                    </h3>
                    <ul className="space-y-1">
                      <li>Összes cikk: <span className="font-semibold text-white">{data.totalArticles} db</span></li>
                      <li>Napi cikkek száma: <span className="font-semibold text-white">{data.daily} db</span></li>
                      <li>Heti cikkek száma: <span className="font-semibold text-white">{data.weekly} db</span></li>
                      <li>Havi cikkek száma: <span className="font-semibold text-white">{data.monthly} db</span></li>
                    </ul>
                  </section>

                  <hr className="border-white/10" />

                  <section>
                    <h3 className="text-[13px] font-semibold text-slate-100 mb-1">
                      Tartalom minősége
                    </h3>
                    <ul className="space-y-1">
                      <li>Átlagos cikkhossz: <span className="font-semibold text-white">{data.avgLength}</span></li>
                      <li>Átlagos olvasási idő: <span className="font-semibold text-white">{data.avgReadTime}</span></li>
                      <li>Átlagos plágiumérték: <span className="font-semibold text-white">{data.avgPlagiarism}%</span></li>
                      <li>Leggyakoribb témák: <span className="font-semibold text-white">{data.topTopics.join(", ")}</span></li>
                    </ul>
                  </section>

                </div>
              </>
            )}
          </main>

          {/* JOBB OLDAL – TELJESÍTMÉNY */}
          <aside className="col-span-3 bg-[#0b1220] border border-white/10 rounded-md p-3 text-[12px] text-slate-200 flex flex-col gap-3">

            {!domain && (
              <div className="text-slate-400 text-sm mt-10 text-center">
                Válassz domaint a bal oldalon.
              </div>
            )}

            {domain && data?.success && (
              <>
                <h2 className="text-[14px] font-semibold text-sky-300">
                  Teljesítmény
                </h2>

                <section>
                  <h3 className="text-[13px] font-semibold text-slate-100 mb-1">
                    Oldal aktív időszaka
                  </h3>
                  <ul className="space-y-1">
                    <li>Átlagos posztolási időszak: <span className="font-semibold text-white">{data.activeRange}</span></li>
                    <li>Legaktívabb óra: <span className="font-semibold text-white">{data.peakHour}</span></li>
                    <li>Legaktívabb nap: <span className="font-semibold text-white">{data.peakDay}</span></li>
                  </ul>
                </section>

                <div className="mt-2 h-24 rounded-md bg-[#071826] border border-white/10 flex items-center justify-center text-[11px] text-slate-400">
                  Aktivitás grafikon helye
                </div>
              </>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
