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
            A hírek mögötti összefüggések, források és előzmények egy helyen.
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
            <ul>
              <li>Források összehasonlítása</li>
              <li>Előzmények és idővonalak</li>
            </ul>
            <button className="premium-btn w-100" type="button" disabled aria-disabled="true">Jelenleg nem elérhető</button>
          </div>

          {/* Éves */}
          <div className="premium-card highlight glass">
            <div className="badge-popular">Legjobb ár</div>
            <div className="price">9000 Ft<span>/év</span></div>
            <ul>
              <li>Források összehasonlítása</li>
              <li>Közös és eltérő állítások</li>
              <li>Konfliktusok és kapcsolódó szereplők</li>
            </ul>
            <button className="premium-btn w-100" type="button" disabled aria-disabled="true">Jelenleg nem elérhető</button>
          </div>

          {/* Támogató */}
          <div className="premium-card glass supporter">
            <div className="price">Támogató</div>
            <div className="desc">
              Támogasd az Utom független hírelemző projektjét.
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
            <p className="mt-5 text-sm opacity-80">A céges csomag részletei és az API-hozzáférés még nem érhető el.</p>
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
      Ingyen: mi történt? Prémiumban: mi van mögötte?
    </p>

    {/* Top 4 highlight */}
    <div className="why-grid mb-5">
      <div className="why-card">
        <div className="why-icon">🧭</div>
        <h5>Előzmények és idővonal</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">⚡</div>
        <h5>Források összehasonlítása</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">🚫</div>
        <h5>Közös és eltérő állítások</h5>
      </div>

      <div className="why-card">
        <div className="why-icon">💬</div>
        <h5>Konfliktusok és kapcsolódó szereplők</h5>
      </div>
    </div>

    {/* Detailed Features */}
    <div className="row row-cols-1 row-cols-md-2 g-4 text-start">

      {[
        { icon: "🧭", title: "Előzmények és idővonal", desc: "Lásd, hogyan alakult egy történet, és milyen korábbi állítások kapcsolódnak hozzá." },
        { icon: "🧱", title: "Források összehasonlítása", desc: "Egy témáról több forrás nézete egy helyen, közös és eltérő állításokkal." },
        { icon: "⚖️", title: "Konfliktusok", desc: "Az eltérő állítások külön jelennek meg, hogy könnyebb legyen összevetni őket." },
        { icon: "🔗", title: "Kapcsolódó szereplők", desc: "Az eseményhez kapcsolódó szereplők és tények áttekinthető nézetben." },
        { icon: "📊", title: "Forráseloszlás", desc: "Megmutatjuk, mely források és témák jelennek meg egy történetben." },
        { icon: "📝", title: "Bizonyíték-alapú kontextus", desc: "A megjelenített összefüggésekhez a kapcsolódó forrás és időpont is megmarad." }
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

