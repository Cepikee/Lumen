"use client";

export default function PremiumPage() {
  return (
    <main className="pb-5">
      {/* Felső szakasz */}
      <section className="py-5 text-center">
        <div className="container">
          <h1 className="fs-2 fw-bold mb-3">
            Az Utom Prémium még tisztábban mutatja meg, mi van a hírek mögött. Egyszerűen, letisztultan.
          </h1>
          <div className="d-flex justify-content-center gap-4 mt-4 flex-wrap">
            <div className="border rounded p-4 shadow-sm text-center" style={{ minWidth: "200px" }}>
              <h3 className="fs-4 mb-2">1000 Ft / hó</h3>
            </div>

            <div className="border rounded p-4 shadow-sm text-center" style={{ minWidth: "200px" }}>
              <h3 className="fs-4 mb-2">9000 Ft / év</h3>
              <p className="text-success fw-bold mb-0">Megtakarítás: 25%</p>
            </div>
          </div>
        </div>
      </section>

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
          <button className="btn btn-primary">Előfizetés havi csomagra</button>
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
