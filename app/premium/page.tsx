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

          {/* Céges */}
          <div className="premium-card glass">
            <div className="price">Céges</div>
            <div className="desc">Egyedi dashboard és riportok</div>
            <button className="premium-btn w-100">Kapcsolat</button>
          </div>

        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="trust-section text-center">
        <div className="container">
          <h2 className="mb-4">Miért bíznak bennünk?</h2>
          <div className="trust-grid">
            <div>🔒 100% reklámmentes élmény</div>
            <div>⚡ Valós idejű AI elemzés</div>
            <div>🧠 Torzítás detektálás</div>
            <div>💬 Zárt prémium közösség</div>
          </div>
        </div>
      </section>

    </main>
  );
}