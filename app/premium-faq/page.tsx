"use client";

import { useState } from "react";

export default function PremiumFAQ() {
  return (
    <main className="container py-5">

      <div className="row">
        
        {/* BAL OLDALI KATEGÓRIAOSZLOP */}
        <aside className="col-md-3 mb-4">
          <div className="faq-sidebar p-3 rounded-4">
            <h5 className="fw-bold mb-3">Tartalom</h5>
            <ul className="list-unstyled m-0">
              <li><a href="#about">Mi az Utom Prémium?</a></li>
              <li><a href="#plans">Előfizetési csomagok</a></li>
              <li><a href="#payment">Fizetés</a></li>
              <li><a href="#faq">GYIK</a></li>
            </ul>
          </div>
        </aside>

        {/* JOBB OLDALI TARTALOM */}
        <section className="col-md-9">

          <h1 className="fs-2 fw-bold mb-4">Utom Prémium – Gyakori kérdések</h1>

          <p className="text-muted mb-5">
            Minden, amit az Utom Prémiumról tudni érdemes – egyszerűen, tisztán, érthetően.
          </p>

          {/* SZEKCIÓ: MI AZ UTOM PRÉMIUM */}
          <div id="about" className="faq-section mb-5">
            <h2 className="fs-4 fw-bold mb-3">Mi az az Utom Prémium?</h2>
            <p className="text-muted">
              Az Utom Prémium egy havi vagy éves előfizetés, amely extra funkciókat,
              reklámmentes élményt és fejlettebb tartalmi eszközöket biztosít.
            </p>
          </div>

          {/* SZEKCIÓ: CSOMAGOK */}
          <div id="plans" className="faq-section mb-5">
            <h2 className="fs-4 fw-bold mb-3">Előfizetési csomagok</h2>

            <div className="d-flex gap-3 flex-wrap">
              <div className="faq-card p-4 rounded-4 flex-fill">
                <div className="fs-4 fw-bold">1000 Ft / hó</div>
                <div className="text-muted">Havi előfizetés</div>
              </div>

              <div className="faq-card p-4 rounded-4 flex-fill position-relative border-primary">
                <div className="position-absolute top-0 start-50 translate-middle badge bg-primary">
                  Megtakarítás: 25%
                </div>
                <div className="fs-4 fw-bold text-primary">9000 Ft / év</div>
                <div className="text-muted">Éves előfizetés</div>
              </div>
            </div>
          </div>

          {/* SZEKCIÓ: FIZETÉS */}
          <div id="payment" className="faq-section mb-5">
            <h2 className="fs-4 fw-bold mb-3">Fizetés</h2>
            <p className="text-muted">
              Az Utom Prémium jelenleg <strong>Barion</strong> fizetéssel érhető el.
              Bankkártyát, Barion-tárcát és több hazai fizetési módot is támogat.
            </p>
          </div>

          {/* SZEKCIÓ: GYIK */}
          <div id="faq" className="faq-section">
            <h2 className="fs-4 fw-bold mb-4">Gyakori kérdések</h2>

            {faqList.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>

        </section>
      </div>

      {/* STÍLUSOK */}
      <style jsx>{`
        .faq-sidebar {
          background: var(--bs-light-bg-subtle);
          border: 1px solid var(--bs-border-color);
        }

        .faq-sidebar a {
          color: var(--bs-body-color);
          text-decoration: none;
          display: block;
          padding: 6px 0;
          transition: opacity 0.15s;
        }

        .faq-sidebar a:hover {
          opacity: 0.6;
        }

        .faq-card {
          border: 1px solid var(--bs-border-color);
          background: var(--bs-body-bg);
          min-width: 240px;
        }

        .faq-box {
          border: 1px solid var(--bs-border-color);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .faq-box:hover {
          background: rgba(0, 0, 0, 0.03);
        }

        .faq-answer {
          padding: 10px 4px 0 4px;
          color: var(--bs-body-color);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .faq-question {
          font-size: 1.1rem;
          font-weight: 600;
        }
      `}</style>

    </main>
  );
}

const faqList = [
  {
    q: "Az előfizetés automatikusan megújul?",
    a: <>Nem. Az Utom Prémium <strong>nem újul meg automatikusan</strong>.</>
  },
  {
    q: "Hol találom meg az aktív előfizetésemet?",
    a: <>A profilodban, a <strong>Beállítások → Előfizetés</strong> menüpont alatt.</>
  },
  {
    q: "Mi történik, ha lejár az előfizetésem?",
    a: <>A Prémium funkciók kikapcsolnak, de a fiókod megmarad.</>
  },
  {
    q: "Miért nem tudok előfizetni?",
    a: (
      <>
        Ha a fizetés sikertelen, annak több oka lehet:
        <ul>
          <li>Lejárt vagy hibás bankkártya</li>
          <li>A bank visszautasította a tranzakciót</li>
          <li>Barion technikai hiba</li>
        </ul>
      </>
    )
  },
  {
    q: "Hol kérhetek további segítséget?",
    a: <>Írj nekünk: <strong>info@utom.hu</strong></>
  }
];

type FAQItemProps = {
  question: string;
  answer: React.ReactNode;
};

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="faq-box" onClick={() => setOpen(!open)}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="faq-question">{question}</div>
        <div>{open ? "▲" : "▼"}</div>
      </div>
      {open && <div className="faq-answer">{answer}</div>}
    </div>
  );
}
