"use client";
export default function PremiumPage() {
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

          <button className="premium-btn-lg mt-4" type="button" disabled aria-disabled="true" title="Az előfizetés jelenleg nem érhető el">
            Prémium hozzáférés indítása
          </button>

          <p className="small text-muted mt-3">
            Az előfizetés és a próbaidő jelenleg nem érhető el.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section">
        <div className="container d-flex justify-content-center gap-4 flex-wrap">

          {/* Havi */}
          <div className="premium-card glass">
            <div className="price">1000 Ft<span>/hó</span></div>
            <li> Minden prémium funkció</li>
            <li> Bármikor lemondható </li>
            <button className="premium-btn w-100" type="button" disabled aria-disabled="true">Jelenleg nem elérhető</button>
          </div>

          {/* Éves */}
          <div className="premium-card highlight glass">
            <div className="badge-popular">Legjobb ár</div>
            <div className="price">9000 Ft<span>/év</span></div>
            <li> Minden prémium funkció</li>
            <li> 2 hónap ingyen </li>
            <li> Költséghatékony </li>
            <button className="premium-btn w-100" type="button" disabled aria-disabled="true">Jelenleg nem elérhető</button>
          </div>

          {/* Támogató */}
          <div className="premium-card glass supporter">
            <div className="price">Támogató</div>
            <div className="desc">
              Támogasd az első AI-vezérelt magyar hírelemző projektet.
            </div>
             <input
             type="number"
             placeholder="Összeg (Ft)"
             className="supporter-input"
             disabled
             aria-disabled="true"
             title="A támogatás jelenleg nem érhető el"
            />
             <button className="premium-btn w-100 mt-3" type="button" disabled aria-disabled="true">Jelenleg nem elérhető</button>
          </div>
          {/* Céges */}
          <div className="premium-card glass">
            <div className="price">Cégeknek</div>
            <div className="mt-5 space-y-2 text-sm opacity-80">
              <li>📊 API hozzáférés</li>
              <li>👥 Dedikált support</li>
              <li> Egyedi kérések </li>
            </div>
            <button className="premium-btn w-100" type="button" disabled aria-disabled="true">Jelenleg nem elérhető</button>
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
        <div className="why-icon">🧠</div>
        <h5>Értelmezett hírek</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">⚡</div>
        <h5>Átlátod a torzításokat és manipulációt</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">🚫</div>
        <h5>Zajmentes, tiszta információs tér</h5>
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
              <p className="mb-0">{item.desc}</p>
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

