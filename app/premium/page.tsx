"use client";

import { useEffect } from "react";

export default function PremiumPage() {
  useEffect(() => {
    function applyVarsForBody() {
      const root = document.documentElement;
      const isDark = document.body.classList.contains("dark");
      const isLight = document.body.classList.contains("light");

      if (isDark) {
        root.style.setProperty("--premium-bg", "#0f1113");
        root.style.setProperty("--premium-section", "#121316");
        root.style.setProperty("--premium-card", "#17181a");
        root.style.setProperty("--premium-text", "#e6e6e6");
      } else if (isLight) {
        root.style.setProperty("--premium-bg", "#ffffff");
        root.style.setProperty("--premium-section", "#f5f5f5");
        root.style.setProperty("--premium-card", "#ffffff");
        root.style.setProperty("--premium-text", "#000000");
      } else {
        // system vagy nincs explicit osztály: fallback a prefers-color-scheme alapján
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          root.style.setProperty("--premium-bg", "#0f1113");
          root.style.setProperty("--premium-section", "#121316");
          root.style.setProperty("--premium-card", "#17181a");
          root.style.setProperty("--premium-text", "#e6e6e6");
        } else {
          root.style.setProperty("--premium-bg", "#ffffff");
          root.style.setProperty("--premium-section", "#f5f5f5");
          root.style.setProperty("--premium-card", "#ffffff");
          root.style.setProperty("--premium-text", "#000000");
        }
      }
    }

    // Első alkalmazás
    applyVarsForBody();

    // Figyeljük a body class változását (ThemeSwitch frissítésekor)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && (m.attributeName === "class" || m.attributeName === "className")) {
          applyVarsForBody();
          break;
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // Ha a prefers-color-scheme változik (rendszer mód), frissítjük
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const mqHandler = () => applyVarsForBody();
    if (mq.addEventListener) {
      mq.addEventListener("change", mqHandler);
    } else {
      mq.addListener(mqHandler);
    }

    return () => {
      observer.disconnect();
      if (mq.removeEventListener) {
        mq.removeEventListener("change", mqHandler);
      } else {
        mq.removeListener(mqHandler);
      }
    };
  }, []);

  return (
    <main
      className="premium-page pb-5"
      style={{
        backgroundColor: "var(--premium-bg, #ffffff)",
        color: "var(--premium-text, #000000)"
      }}
    >
      {/* Felső szakasz */}
      <section
        className="premium-section py-5 text-center"
        style={{ backgroundColor: "var(--premium-section, #f5f5f5)" }}
      >
        <div className="container">
          <h1 className="fs-2 fw-bold mb-3">
            A hirdetésmentesség csak a kezdet. Az Utom Prémium a minőség új szintje.
          </h1>
          <p className="mx-auto fs-5 text-muted" style={{ maxWidth: "600px" }}>
            Olyan eszközöket kapsz, amelyekkel tényleg átlátod a híreket — gyorsabban, tisztábban, okosabban.
          </p>

          <div className="d-flex justify-content-center gap-4 mt-4 flex-wrap">
            <div
              className="border rounded p-4 shadow-sm text-center premium-card"
              style={{
                minWidth: "200px",
                backgroundColor: "var(--premium-card, #ffffff)"
              }}
            >
              <h3 className="fs-4 mb-2">1000 Ft / hó</h3>
            </div>

            <div
              className="border rounded p-4 shadow-sm text-center premium-card"
              style={{
                minWidth: "200px",
                backgroundColor: "var(--premium-card, #ffffff)"
              }}
            >
              <h3 className="fs-4 mb-2">9000 Ft / év</h3>
              <p className="text-success fw-bold mb-0">Megtakarítás: 25%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Funkciólista */}
      <section
        className="py-5"
        style={{ backgroundColor: "var(--premium-bg, #ffffff)" }}
      >
        <div className="container">
          <h2 className="text-center fs-3 fw-bold mb-5">Az Utom prémium csomagja:</h2>

          <div className="row row-cols-1 row-cols-md-2 g-4">
            {[
              { icon: "🧬", title: "Utom Forrás‑DNS", desc: "AI‑alapú forrásprofil, amely megmutatja, milyen témák dominálnak egy hírportálnál — százalékos bontásban." },
              { icon: "🧠", title: "Fake Detektor", desc: "AI kiszűri a manipulált, torzított vagy hamis tartalmakat." },
              { icon: "🧊", title: "Clickbait Detektor", desc: "Automatikusan felismeri a kattintásvadász címeket, és visszaveszi a zajt." },
              { icon: "🧱", title: "Cikk összehasonlítás", desc: "Több forrás egy kattintással összevetve. Látod, ki mit hallgat el." },
              { icon: "🧭", title: "Trendek automatikus súlyozása", desc: "Az Utom AI kiszűri a mesterségesen felfújt témákat — csak a valódi trendek maradnak." },
              { icon: "💬", title: "Prémium chat szoba", desc: "Zárt közösség, ahol a prémium tagok beszélgethetnek, vitázhatnak, elemezhetnek." },
              { icon: "🧑‍⚖️", title: "Hitelességi szavazás", desc: "A szavazatod többet ér. A közösségi minőségkontroll így sokkal pontosabb." },
              { icon: "🧘‍♂️", title: "Ultra‑minimalista mód", desc: "Csak a lényeg: reklám nélkül, sallang nélkül, egyetlen összefoglalóval (UtomScore)." }
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
