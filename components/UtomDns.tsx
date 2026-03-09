// components/UtomDns.tsx
"use client";

import React from "react";

export default function UtomDns() {
  return (
    <div className="w-screen h-screen bg-[#071226] flex flex-col overflow-hidden">

      {/* TOP CONTENT – MINDEN DOBOZ FELE MAGASSÁGRA VÁGVA */}
      <div className="flex-1 overflow-hidden p-3 box-border pb-1">
        <div className="w-full h-full grid grid-cols-12 gap-3 overflow-hidden">

          {/* LEFT */}
          <aside className="col-span-3 bg-[#0b1220] border border-white/5 rounded-md p-2 shadow-sm text-[10px] flex flex-col gap-2">

            <h3 className="text-[11px] font-semibold">Bal</h3>

            <div className="h-5 bg-[#071826] rounded-md flex items-center px-2 text-slate-300">Placeholder 1</div>
            <div className="h-5 bg-[#071826] rounded-md flex items-center px-2 text-slate-300">Placeholder 2</div>
            <div className="h-5 bg-[#071826] rounded-md flex items-center px-2 text-slate-300">Placeholder 3</div>

          </aside>

          {/* CENTER */}
          <main className="col-span-6 bg-[#0b1220] border border-white/5 rounded-md p-2 shadow-sm text-[10px] flex flex-col gap-2">

            <h2 className="text-[11px] font-semibold text-sky-300">Közép</h2>

            <div className="bg-[#071826] rounded-md p-2 border border-white/6">
              <div className="text-[10px] text-white mb-1">Fő kártya</div>
              <div className="h-12 bg-[#06121a] rounded-md flex items-center justify-center text-slate-400">
                Tartalom helye
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#071826] rounded-md p-2 border border-white/6 h-10 flex items-center justify-center text-slate-400">
                Kártya A
              </div>
              <div className="bg-[#071826] rounded-md p-2 border border-white/6 h-10 flex items-center justify-center text-slate-400">
                Kártya B
              </div>
            </div>

            <div className="bg-[#071826] rounded-md p-2 border border-white/6">
              <div className="text-[10px] text-slate-300">Lista / részletek</div>

              <ul className="mt-2 space-y-1">
                <li className="h-5 bg-[#06121a] rounded-md flex items-center px-2 text-slate-400">Elem 1</li>
                <li className="h-5 bg-[#06121a] rounded-md flex items-center px-2 text-slate-400">Elem 2</li>
                <li className="h-5 bg-[#06121a] rounded-md flex items-center px-2 text-slate-400">Elem 3</li>
              </ul>
            </div>

          </main>

          {/* RIGHT */}
          <aside className="col-span-3 bg-[#0b1220] border border-white/5 rounded-md p-2 shadow-sm text-[10px] flex flex-col gap-2">

            <h3 className="text-[11px] font-semibold text-sky-300">Jobb</h3>

            <div className="bg-[#071826] rounded-md p-2 border border-white/6">
              <div className="text-[10px] text-slate-300 mb-1">Gyors stat</div>
              <div className="text-white font-bold text-[12px]">58%</div>
            </div>

            <div className="bg-[#071826] rounded-md p-2 border border-white/6">
              <div className="text-[10px] text-slate-300 mb-1">Mutató</div>
              <div className="h-8 bg-[#06121a] rounded-md flex items-center justify-center text-slate-400">
                Grafikon helye
              </div>
            </div>

            <div className="bg-[#071826] rounded-md p-2 border border-white/6">
              <div className="text-[10px] text-slate-300 mb-1">Akciók</div>
              <div className="flex flex-col gap-1">
                <button className="w-full py-1 bg-sky-600/10 text-sky-300 rounded-md border border-sky-600 text-[10px]">
                  Gomb 1
                </button>
                <button className="w-full py-1 bg-white/6 text-white rounded-md border border-white/8 text-[10px]">
                  Gomb 2
                </button>
              </div>
            </div>

          </aside>

        </div>
      </div>

      {/* FOOTER – MÉG KISEBB, MÉG FELJEBB */}
      <footer className="h-[22px] bg-[#071826] border-t border-white/10 flex items-center justify-between px-3 flex-none text-[9px] w-[45%] mx-auto rounded-md mb-1">
        <div className="text-slate-300">Footer bal</div>
        <div className="text-slate-400">Footer közép</div>
        <div className="text-slate-400">Footer jobb</div>
      </footer>

    </div>
  );
}
