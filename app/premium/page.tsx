"use client";

export default function PremiumPage() {
  return (
    <main className="pb-5 premium-root">

      {/* HERO */}
      <section className="premium-hero text-center">
        <div className="container">

          <img src="./utomlogo.png" alt="Utom" height="44" className="mb-4" />

          <h1 className="premium-title">
            Az Utom Prémium
          </h1>

          <p className="premium-subtitle">
            Nem több hír. Jobb megértés.  
            Tisztábban látod, mi van a felszín alatt.
          </p>

          {/* PRICING */}
          <div className="pricing-grid mt-5">

            {/* HAVI */}
            <div className="pricing-card">
              <div className="pricing-header">Havi</div>
              <div className="pricing-price">1000 Ft</div>
              <div className="pricing-sub">havonta</div>

              <button className="btn btn-outline-primary w-100 mt-4">
                Csatlakozom
              </button>
            </div>

            {/* ÉVES */}
            <div className="pricing-card featured">
              <div className="badge-save">–25%</div>

              <div className="pricing-header">Éves</div>
              <div className="pricing-price">9000 Ft</div>
              <div className="pricing-sub">évente</div>

              <button className="btn btn-primary w-100 mt-4">
                Prémium leszek
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* FUNKCIÓK */}
      <section className="py-5">
        <div className="container">

          <h2 className="text-center fw-bold mb-5">
            Mit kapsz Prémiumként?
          </h2>

          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {[
              { icon: "🧬", title: "Forrás DNS", desc: "AI-alapú tartalmi ujjlenyomat minden hírforráshoz." },
              { icon: "🧠", title: "Fake Detektor", desc: "Hamis vagy torzító tartalmak automatikus felismerése." },
              { icon: "🧊", title: "Clickbait Detektor", desc: "Megmutatjuk, mennyire kattintásvadász egy cím." },
              { icon: "🧱", title: "Cikk Összehasonlítás", desc: "Ugyanaz a hír több forrásból, egy nézetben." },
              { icon: "🧭", title: "Forrás-Radar", desc: "Ki beszél egy témáról – és ki hallgat?" },
              { icon: "💬", title: "Prémium Közösség", desc: "Zárt tér gondolkodó felhasználóknak." },
              { icon: "🧑‍⚖️", title: "Közösségi Vélemény", desc: "Valódi felhasználói visszajelzések cikkekről." },
              { icon: "🧘‍♂️", title: "Ultra-minimalista mód", desc: "Reklámmentes, sallang nélküli olvasás." }
            ].map((f, i) => (
              <div key={i}>
                <div className="feature-card h-100">
                  <div className="feature-icon">{f.icon}</div>
                  <h5>{f.title}</h5>
                  <p className="text-muted small mb-0">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-5 premium-cta">
        <h3 className="fw-bold mb-3">
          Az Utom Prémium nem mindenkinek való.
        </h3>
        <p className="text-muted mb-4">
          Csak azoknak, akik szeretnek mélyebbre ásni.
        </p>

        <button className="btn btn-primary btn-lg">
          Csatlakozom a Prémiumhoz
        </button>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-muted small mt-5">
        <p>
          Bizonyos funkciók csak aktív Prémium tagsággal érhetők el.
        </p>
        <a href="/premium-faq" className="text-decoration-underline">
          Gyakori kérdések
        </a>
      </footer>

      {/* STYLES */}
      <style jsx>{`
        .premium-root {
          background: #fafafa;
        }

        .premium-hero {
          padding: 80px 0 100px;
          background: linear-gradient(
            135deg,
            rgba(13,110,253,0.08),
            rgba(0,0,0,0)
          );
        }

        .premium-title {
          font-size: clamp(2.2rem, 4vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .premium-subtitle {
          max-width: 620px;
          margin: 16px auto 0;
          font-size: 1.1rem;
          color: var(--bs-secondary-color);
        }

        .pricing-grid {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .pricing-card {
          position: relative;
          width: 280px;
          padding: 28px;
          border-radius: 20px;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.06);
          text-align: center;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,.08);
        }

        .pricing-card.featured {
          border: 2px solid var(--bs-primary);
        }

        .badge-save {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bs-primary);
          color: #fff;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: .75rem;
        }

        .pricing-header {
          font-weight: 600;
          margin-bottom: 8px;
        }

        .pricing-price {
          font-size: 2rem;
          font-weight: 700;
        }

        .pricing-sub {
          font-size: .9rem;
          color: var(--bs-secondary-color);
        }

        .feature-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(6px);
          border-radius: 16px;
          padding: 22px;
          border: 1px solid rgba(0,0,0,0.05);
          transition: transform .15s ease;
        }

        .feature-card:hover {
          transform: translateY(-2px);
        }

        .feature-icon {
          font-size: 1.8rem;
          margin-bottom: 8px;
        }

        .premium-cta {
          background: linear-gradient(
            180deg,
            rgba(13,110,253,0.06),
            rgba(0,0,0,0)
          );
        }
      `}</style>

    </main>
  );
}
