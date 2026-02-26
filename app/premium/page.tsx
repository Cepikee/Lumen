"use client";

import { useState } from "react";

export default function PremiumPage() {
  const [supportAmount, setSupportAmount] = useState("");

  return (
    <main className="min-h-screen bg-[#0f172a] text-white pb-20
      bg-[radial-gradient(circle_at_30%_20%,rgba(0,153,255,0.2),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(0,204,153,0.2),transparent_40%)]">

      {/* HERO */}
      <section className="text-center px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">

          <img src="/utomlogo.png" alt="Utom" className="h-12 mx-auto mb-6 opacity-75" />

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Lásd a hírek mögötti{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              valódi szerkezetet
            </span>.
          </h1>

          <p className="mt-6 text-lg opacity-80">
            Mélyebb elemzés. Torzítás nélkül. Reklámok nélkül.
          </p>

          <button className="mt-8 px-8 py-3 rounded-full font-semibold
            bg-gradient-to-r from-cyan-400 to-emerald-400
            text-slate-900 hover:scale-105 transition-all duration-200
            shadow-lg shadow-emerald-400/30">
            Prémium hozzáférés indítása
          </button>

          <p className="mt-3 text-sm opacity-60">
            7 napos kockázatmentes kipróbálás
          </p>

        </div>
      </section>

      {/* PRICING */}
      <section className="px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6">

          {/* Havi */}
          <div className="w-[280px] rounded-3xl p-10 backdrop-blur-xl
            bg-white/5 border border-white/10
            hover:-translate-y-2 transition-all duration-300">

            <div className="text-3xl font-bold">
              1000 Ft<span className="text-base opacity-70">/hó</span>
            </div>

            <p className="mt-4 opacity-70">
              Rugalmas, bármikor lemondható
            </p>

            <button className="mt-6 w-full py-3 rounded-full font-semibold
              bg-gradient-to-r from-cyan-400 to-emerald-400
              text-slate-900 hover:scale-105 transition-all">
              Előfizetek
            </button>
          </div>

          {/* Éves */}
          <div className="relative w-[280px] rounded-3xl p-10 backdrop-blur-xl
            bg-white/5 border border-cyan-400
            scale-105 shadow-2xl shadow-cyan-400/30
            hover:-translate-y-2 transition-all duration-300">

            <div className="absolute -top-3 left-1/2 -translate-x-1/2
              bg-gradient-to-r from-cyan-400 to-emerald-400
              text-slate-900 text-xs font-semibold px-4 py-1 rounded-full">
              Legjobb ár
            </div>

            <div className="text-3xl font-bold">
              9000 Ft<span className="text-base opacity-70">/év</span>
            </div>

            <p className="mt-4 opacity-70">
              2 hónap ajándék
            </p>

            <button className="mt-6 w-full py-3 rounded-full font-semibold
              bg-gradient-to-r from-cyan-400 to-emerald-400
              text-slate-900 hover:scale-105 transition-all">
              Éves csomag indítása
            </button>
          </div>

          {/* Támogató */}
          <div className="w-[280px] rounded-3xl p-10 backdrop-blur-xl
            bg-white/5 border border-white/10
            hover:-translate-y-2 transition-all duration-300">

            <div className="text-2xl font-bold">
              💛 Támogató
            </div>

            <p className="mt-4 text-sm opacity-70">
              Támogasd a független, AI-alapú hírelemzést.
              Küldj annyit, amennyit szeretnél.
            </p>

            <input
              type="number"
              value={supportAmount}
              onChange={(e) => setSupportAmount(e.target.value)}
              placeholder="Összeg (Ft)"
              className="mt-5 w-full px-4 py-2 rounded-xl
                bg-white/5 border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />

            <button className="mt-4 w-full py-3 rounded-full font-semibold
              bg-gradient-to-r from-cyan-400 to-emerald-400
              text-slate-900 hover:scale-105 transition-all">
              Támogatás küldése
            </button>
          </div>

          {/* Cégeknek */}
          <div className="w-[280px] rounded-3xl p-10 backdrop-blur-xl
            bg-white/5 border border-white/10
            hover:-translate-y-2 transition-all duration-300">

            <div className="text-2xl font-bold">
              🏢 Cégeknek
            </div>

            <ul className="mt-5 space-y-2 text-sm opacity-80">
              <li>• API hozzáférés</li>
              <li>• Dedikált support</li>
              <li>• Egyedi kérések és fejlesztések</li>
            </ul>

            <button className="mt-6 w-full py-3 rounded-full font-semibold
              bg-gradient-to-r from-cyan-400 to-emerald-400
              text-slate-900 hover:scale-105 transition-all">
              Ajánlatkérés
            </button>
          </div>

        </div>
      </section>

      {/* WHY PREMIUM */}
      <section className="px-6 pt-24 text-center">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-2xl md:text-3xl font-bold">
            Miért legyél{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Prémium
            </span>{" "}
            tag?
          </h2>

          <p className="mt-4 opacity-70">
            Több kontroll. Több tisztánlátás. Nulla zaj.
          </p>

        </div>
      </section>
      {/* Detailed Features */}
<section className="px-6 pt-16 pb-24">
  <div className="max-w-6xl mx-auto">

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {[
        { icon: "🧬", title: "Forrás DNS", desc: "AI-alapú tartalmi ujjlenyomat, amely feltárja egy hírportál szerkezetét és mintázatait." },
        { icon: "🧠", title: "Fake Detektor", desc: "Kiszűrjük a hamis, félrevezető vagy manipulált tartalmakat — torzítás nélkül." },
        { icon: "🧊", title: "Clickbait Detektor", desc: "Megmutatjuk, mennyire kattintásvadász egy cím — objektív pontszámmal." },
        { icon: "🧱", title: "Cikk Összehasonlítás", desc: "Egy témáról több forrás nézete egy helyen — az eltérések kiemelve." },
        { icon: "🧭", title: "Forrás-Radar", desc: "Láthatod, mely portálok dominálnak egy témában — és kik maradnak csendben." },
        { icon: "💬", title: "Prémium Chat Szoba", desc: "Exkluzív közösség, ahol elemzünk, vitázunk és együtt gondolkodunk." },
        { icon: "🧑‍⚖️", title: "Közösségi Vélemény", desc: "Valódi felhasználói visszajelzések egy cikk megbízhatóságáról." },
        { icon: "🧘‍♂️", title: "Ultra-minimalista mód", desc: "Csak a lényeg — reklám és zavaró elemek nélkül." }
      ].map((item, i) => (
        <div
          key={i}
          className="flex gap-4 p-6 rounded-2xl
            bg-white/5 border border-white/10
            backdrop-blur-xl
            hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-400/20
            transition-all duration-300"
        >
          <div className="text-3xl">
            {item.icon}
          </div>

          <div>
            <h4 className="font-semibold text-lg">
              {item.title}
            </h4>
            <p className="mt-2 text-sm opacity-70 leading-relaxed">
              {item.desc}
            </p>
          </div>
        </div>
      ))}

    </div>

  </div>
</section>
    </main>
  );
}