"use client";

export default function PremiumPage() {
  return (
    <main className="pb-5">

      {/* Felső szakasz – HERO háttér + logó + pricing */}
      <section className="py-5 text-center hero-premium">
        <div className="container">

          {/* Utom logó */}
          <div className="mb-4">
            <img src="./utomlogo.png" alt="Utom" height="48" />
          </div>

          <h1 className="fs-2 fw-bold mb-3">
            Az Utom Prémium még tisztábban mutatja meg, mi van a hírek mögött. Egyszerűen, letisztultan.
          </h1>

          {/* Reddit-stílusú pricing gombok */}
          <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">

            {/* Havi */}
            <button className="reddit-btn">
              <div className="fs-4 fw-bold">1000 Ft / hó</div>
              <div className="text-muted small">Havi előfizetés</div>
            </button>

            {/* Éves */}
            <button className="reddit-btn position-relative">
              <div
                className="position-absolute top-0 start-50 translate-middle badge bg-primary"
                style={{ fontSize: "0.75rem" }}
              >
                Megtakarítás: 25%
              </div>
              <div className="fs-4 fw-bold">9000 Ft / év</div>
              <div className="text-muted small">Éves előfizetés</div>
            </button>

          </div>

          {/* Inline CSS */}
          <style jsx>{`
            .hero-premium {
              background: linear-gradient(
                135deg,
                rgba(0, 153, 255, 0.12),
                rgba(0, 204, 153, 0.12)
              );
            }

            .reddit-btn {
              min-width: 260px;
              padding: 18px 24px;
              border-radius: 9999px;
              border: 1px solid var(--bs-border-color);
              background: var(--bs-body-bg);
              text-align: center;
              cursor: pointer;
              transition: opacity 0.15s ease;
            }

            .reddit-btn:hover {
              opacity: 0.75;
            }

            .reddit-btn:focus,
            .reddit-btn:active {
              outline: none;
              opacity: 0.9;
            }
          `}</style>

        </div>
      </section>

      {/* ELVÁLASZTÓ VONAL */}
      <hr className="my-5" />

      {/* Funkciólista */}
      <section className="py-5">
        <div className="container">
          <h2 className="text-center fs-3 fw-bold mb-5">Az Utom prémium csomagja:</h2>

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
              <div key={i} className="d-flex gap-3">
                <div className="fs-2">{item.icon}</div>
                <div>
                  <h5 className="mb-1">{item.title}</h5>
                  <p className="text-muted mb-0">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-4 text-center">
        <div className="d-inline-flex gap-3 flex-wrap">
          <button className="btn btn-outline-primary">Előfizetés havi csomagra</button>
          <button className="btn btn-outline-primary">Előfizetés éves csomagra</button>
        </div>
      </section>

      {/* Lábléc */}
      <section className="text-center text-muted small">
        <p>Bizonyos funkciók csak aktív Prémium tagsággal érhetők el.</p>
        <a href="/premium-faq" className="text-decoration-underline">Gyakori kérdések a Prémiumról</a>
      </section>

    </main>
  );
}
