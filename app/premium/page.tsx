"use client";
import { useState } from "react";

export default function PremiumPage() {
  const [supportAmount, setSupportAmount] = useState("");
  return (
    <main className="premium-wrapper">

      {/* HERO */}
      <section className="premium-hero text-center">
        <div className="container">

          <img src="/utomlogo.png" alt="Utom" height="52" className="mb-4 opacity-75" />

          <h1 className="hero-title">
            Lásd a hírek mögötti <span className="gradient-text">valódi szerkezetet</span>.
          </h1>

          <p className="hero-sub">
            Mélyebb elemzés. Torzítás nélkül. Reklámok nélkül.
          </p>

          <button className="premium-btn-lg mt-4">
            Prémium hozzáférés indítása
          </button>

          <p className="small text-muted mt-3">
            7 napos kockázatmentes kipróbálás
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section">
        <div className="container d-flex justify-content-center gap-4 flex-wrap">

          {/* Havi */}
          <div className="premium-card glass">
            <div className="price">1000 Ft<span>/hó</span></div>
            <div className="desc">Rugalmas, bármikor lemondható</div>
            <button className="premium-btn w-100">Előfizetek</button>
          </div>

          {/* Éves */}
          <div className="premium-card highlight glass">
            <div className="badge-popular">Legjobb ár</div>
            <div className="price">9000 Ft<span>/év</span></div>
            <div className="desc">2 hónap ajándék</div>
            <button className="premium-btn w-100">Éves csomag indítása</button>
          </div>
          {/* TÁMOGATÓ */}
          <div className=" w-[280px] rounded-3xl p-10 backdrop-blur-xl bg-white/5 border border-white/10 transition-all duration-300 hover:-translate-y-2 " >
            <div className="text-2xl font-bold">💛 Támogató</div>

            <p className="mt-4 text-sm opacity-70">
              Támogasd a független, AI-alapú hírelemzést. Küldj annyit,
              amennyit szeretnél.
            </p>

            <input type="number" value={supportAmount} onChange={(e) => setSupportAmount(e.target.value)}
              placeholder="Összeg (Ft)"
              className="
                mt-5 w-full px-4 py-2 rounded-xl
                bg-white/5 border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400
              "
            />

            <button className=" mt-4 w-full py-3 rounded-full font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 transition-all hover:scale-105 " >
              Támogatás küldése
            </button>
          </div>

          {/* Céges */}
          <div className="premium-card glass">
            <div className="price">🏢 Cégeknek</div>
            <div className="mt-5 space-y-2 text-sm opacity-80">
              <li>📊 API hozzáférés</li>
              <li>👥 Dedikált support</li>
              <li> Egyedi kérések </li>
            </div>
            <button className="premium-btn w-100">Kapcsolat</button>
          </div>

        </div>
      </section>

      {/* WHY PREMIUM */}
<section className="why-premium-section text-center">
  <div className="container">

    <h2 className="section-title mb-3">
      Miért legyél <span className="gradient-text">Prémium</span> tag?
    </h2>

    <p className="section-sub mb-5">
      Több kontroll. Több tisztánlátás. Nulla zaj.
    </p>

    {/* Top 4 highlight */}
    <div className="why-grid mb-5">
      <div className="why-card">
        <div className="why-icon">🔒</div>
        <h5>100% reklámmentes élmény</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">⚡</div>
        <h5>Valós idejű AI elemzés</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">🧠</div>
        <h5>Torzítás detektálás</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">💬</div>
        <h5>Zárt prémium közösség</h5>
      </div>
    </div>

    {/* Detailed Features */}
    <div className="row row-cols-1 row-cols-md-2 g-4 text-start">

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
        <div key={i} className="col">
          <div className="premium-feature-card d-flex gap-3">
            <div className="fs-2">{item.icon}</div>
            <div>
              <h5 className="mb-1">{item.title}</h5>
              <p className="text-muted mb-0">{item.desc}</p>
            </div>
          </div>
        </div>
      ))}

    </div>

  </div>
</section>
    </main>
  );
}

