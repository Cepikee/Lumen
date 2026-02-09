"use client";

export default function PremiumPage() {
  return (
    <main className="premium-page pb-5">

      {/* HERO + PRICING */}
      <section className="premium-hero text-center py-5">
        <div className="container">

          <img src="./utomlogo.png" alt="Utom" height="52" className="mb-4 opacity-75" />

          <h1 className="display-6 fw-bold mb-3">
            Az Utom Prémium feltárja a hírek valódi szerkezetét.
          </h1>
          <p className="lead text-muted mb-4">
            Tisztább, gyorsabb, mélyebb elemzés — reklámok nélkül.
          </p>

          {/* Pricing */}
          <div className="premium-pricing-wrapper d-flex justify-content-center gap-4 flex-wrap">

            {/* Havi */}
            <div className="premium-card">
              <div className="price">1000 Ft<span>/hó</span></div>
              <div className="desc">Havi előfizetés</div>
              <button className="premium-btn">Előfizetek</button>
            </div>

            {/* Éves */}
            <div className="premium-card highlight position-relative">
              <div className="badge-popular">Legnépszerűbb</div>
              <div className="price">9000 Ft<span>/év</span></div>
              <div className="desc">Éves előfizetés</div>
              <button className="premium-btn">Előfizetek</button>
            </div>

            {/* Cégeknek */}
            <div className="premium-card enterprise">
              <div className="price">Cégeknek</div>
              <div className="desc">Egyedi árazás alapján</div>
              <button className="premium-btn">Kapcsolat</button>
            </div>

          </div>
        </div>
      </section>

      {/* Funkciók */}
      <section className="py-5">
        <div className="container">
          <h2 className="text-center fs-3 fw-bold mb-5">Mit tartalmaz az Utom Prémium?</h2>

          <div className="row row-cols-1 row-cols-md-2 g-4">
            {[
              { icon: "🧬", title: "Forrás DNS", desc: "AI‑alapú tartalmi ujjlenyomat, amely mindent megmutat egy hírportálról." },
              { icon: "🧠", title: "Fake Detektor", desc: "Kiszűrjük a hamis, félrevezető vagy gyanús tartalmakat — valóság, torzítás nélkül." },
              { icon: "🧊", title: "Clickbait Detektor", desc: "Felismerjük a kattintásvadász címeket, és megmutatjuk, mennyire azok." },
              { icon: "🧱", title: "Cikk Összehasonlítás", desc: "Több forrás egy kattintással összevetve — látod, ki mit ír máshogy." },
              { icon: "🧭", title: "Forrás‑Radar", desc: "Megmutatjuk, mely portálok dominálnak egy témában — és kik maradnak csendben." },
              { icon: "💬", title: "Prémium Chat Szoba", desc: "Zárt közösség, ahol a prémium tagok beszélgethetnek, vitázhatnak, elemezhetnek." },
              { icon: "🧑‍⚖️", title: "Közösségi Vélemény", desc: "A felhasználók visszajelzései alapján láthatod, hogyan értékeli a közösség a cikket." },
              { icon: "🧘‍♂️", title: "Ultra‑minimalista mód", desc: "Csak a lényeg: reklám, sallang nélkül, egyszerűen nagyszerűen." }
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

      {/* CTA */}
      <section className="py-5 text-center">
        <button className="premium-btn-lg">Prémium előfizetés indítása</button>
        <p className="text-muted small mt-2">Bármikor lemondhatod</p>
      </section>

      {/* Lábléc */}
      <section className="text-center text-muted small pb-4">
        <p>Bizonyos funkciók csak aktív Prémium tagsággal érhetők el.</p>
        <a href="/premium-faq" className="text-decoration-underline">Gyakori kérdések a Prémiumról</a>
      </section>

      {/* CSS */}
      <style jsx>{`
        .premium-page {
          background: linear-gradient(135deg, rgba(0,153,255,0.12), rgba(0,204,153,0.12));
        }

        .premium-hero {
          padding-bottom: 80px;
        }

        .premium-card {
          background: var(--bs-body-bg);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 32px 40px;
          width: 260px;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .premium-card:hover {
          transform: translateY(-4px);
          border-color: #0d6efd;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .premium-card.highlight {
          border-color: #0d6efd;
        }

        .badge-popular {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #0d6efd;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .price {
          font-size: 2rem;
          font-weight: 700;
        }

        .price span {
          font-size: 1rem;
          opacity: 0.7;
        }

        .desc {
          color: var(--bs-secondary-color);
          margin-bottom: 20px;
        }

        .premium-btn {
          padding: 10px 22px;
          border-radius: 9999px;
          background: #0d6efd;
          color: white;
          border: none;
          font-weight: 600;
          transition: background 0.2s ease;
        }

        .premium-btn:hover {
          background: #0b5ed7;
        }

        .premium-feature-card {
          background: var(--bs-body-bg);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.2s ease;
        }

        .premium-feature-card:hover {
          transform: translateY(-3px);
        }

        .premium-btn-lg {
          padding: 14px 32px;
          border-radius: 9999px;
          background: #0d6efd;
          color: white;
          border: none;
          font-size: 1.1rem;
          font-weight: 600;
          transition: background 0.2s ease;
        }

        .premium-btn-lg:hover {
          background: #0b5ed7;
        }
      `}</style>

    </main>
  );
}
