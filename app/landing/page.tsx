"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  const enter = () => {
    router.replace("/");
  };

  const scrollToFeatures = () => {
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

useEffect(() => {
  const updateBars = () => {
    const bars = Array.from(
      document.querySelectorAll<HTMLElement>(".trend-bar")
    );

    bars.forEach((bar) => {
      const newHeight = Math.floor(20 + Math.random() * 80); // 20–100px
      // CSS felülütése, ha máshol fix height/max-height van
      bar.style.setProperty("height", `${newHeight}px`, "important");
    });
  };

  updateBars();
  const interval = setInterval(updateBars, 1500);

  return () => clearInterval(interval);
}, []);




  return (
    <div>

      {/* HERO BLOKK */}
      <section className="hero hero-centered">
        <div className="hero-centered-inner">

          {/* BAL OLDALI DOBOZ */}
          <div className="hero-side-box left-box">
            <div className="badge-pill">Magyar hírek gyűjtőhelye</div>
            <h2>Az ország hírei egy rendszerben.</h2>
            <p>
              Nem hírportál, nem vélemény. Egy technikai háttér, ami összerakja neked, mi történik –
              felesleges zaj és clickbait nélkül.
            </p>
            <ul className="feature-list">
              <li>Összegyűjtött hírek több tucat forrásból</li>
              <li>Egységes, tiszta kategóriák</li>
              <li>Napi szintű, átlátható rálátás</li>
            </ul>
          </div>

          {/* KÖZÉPEN – BRAND + CTA */}
          <div className="hero-center">
            <div className="hero-center-inner">
              <div className="logo-row center">
                <img src="/utomlogo.png" alt="Utom logo" className="logo" />
                <span className="brand">UTOM.HU</span>
              </div>

              <div className="ai-pill-row">
                <span className="pill pill-ai">100% AI-alapú hírkeretrendszer</span>
                <span className="pill pill-clean">Tiszta felület, csak a lényeg</span>
              </div>

              <h1 className="hero-title center">
                A magyar hírek keretrendszere.
              </h1>

              <p className="hero-subtitle center">
                Nem hírfolyam, hanem rendszer. Egy felület, ahol érthetően látod,
                miről szól valójában az ország – átláthatóan, logikusan, mentális zaj nélkül.
              </p>

              <div className="hero-actions center">
                <button className="primary-btn large" onClick={enter}>
                  Belépek az Utom.hu-ra
                </button>
                <button className="secondary-btn" onClick={scrollToFeatures}>
                  Mit tud az Utom?
                </button>
              </div>
            </div>
          </div>

          {/* JOBB OLDALI DOBOZ */}
          <div className="hero-side-box right-box">
            <h2>Magyar hírkép egy pillantásra</h2>
            <p>
              Automatikusan gyűjtött, tisztított, kategorizált hírek. Egy felületen látod,
              mi fontos – forrástól függetlenül.
            </p>

            <div className="hero-metrics">
              <div className="metric">
                <span className="metric-label">Forrás</span>
                <span className="metric-value">Több tucat portál</span>
              </div>
              <div className="metric">
                <span className="metric-label">Kategóriák</span>
                <span className="metric-value">Tiszta, értelmezhető</span>
              </div>
              <div className="metric">
                <span className="metric-label">Zaj</span>
                <span className="metric-value metric-bad">Minimumra szűrve</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* VONAL */}
      <div className="section-divider" />
{/* TRENDBLOKK */}
<section className="section">
  <div className="section-inner">
    <div className="trend-box">
      <div className="trend-header">
        <h2>Trendek</h2>
        <h3>Vizuális megjelenítése</h3>
        <h4>Grafikon</h4>
      </div>

      <div className="trend-graph">
        <div className="chart-area">
          
          {/* Y tengely */}
          <div className="trend-labels-y">
            <span>3</span>
            <span>2</span>
            <span>1</span>
          </div>

          {/* Sávok + címkék */}
          <div className="bars-wrapper">
            <div className="trend-bar-group">
              <div className="trend-bar bar1"></div>
              <div className="trend-bar bar2"></div>
              <div className="trend-bar bar3"></div>
            </div>

            <div className="trend-labels-x">
              <span className="label">Politika</span>
              <span className="label">Tech</span>
              <span className="label">Gazdaság</span>
            </div>
          </div>

          {/* X tengely */}
          <div className="trend-axis"></div>
        </div>
      </div>
    </div>
  </div>
</section>



      {/* VONAL */}
      <div className="section-divider" />

      {/* MODULOK */}
      <section className="section" id="features">
        <div className="section-inner">
          <div className="section-header">
            <h2>Hogyan dolgozik az Utom?</h2>
            <p>
              A háttérben egy fejlesztői szemlélettel épített rendszer figyeli a magyar online sajtót,
              tisztítja a bejövő adatot, és olyan nézeteket ad, amik nem fárasztanak, hanem segítenek.
            </p>
          </div>

          <div className="cards">
            <div className="card">
              <h3>Összegyűjtés</h3>
              <p>
                A rendszer folyamatosan figyeli a magyar online sajtót, és automatikusan gyűjti a híreket
                több, egymástól független forrásból.
              </p>
            </div>

            <div className="card">
              <h3>Tisztítás & rendezés</h3>
              <p>
                AI-alapú szűrés, normalizált adatok, egységes kategóriák – hogy összehasonlítható legyen,
                amit egyébként tíz külön helyről olvasnál össze.
              </p>
            </div>

            <div className="card">
              <h3>Átlátható nézetek</h3>
              <p>
                Feed, mai nap, forrás- és kategória nézet. Nem infózaj,
                hanem kontrollált, logikus rálátás arra, mi történik az országban.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VONAL */}
      <div className="section-divider" />

      {/* PRÉMIUM ÉLMÉNY */}
      <section className="section alt">
        <div className="section-inner">
          <div className="section-header">
            <h2>Miért prémium élmény?</h2>
            <p>
              Az Utom célja egyszerű: időt és mentális terhet spórolni.
              Nem kampány, nem marketing – egy rendszer, ami fejlesztői szemlélettel épül.
            </p>
          </div>

          <div className="cards">
            <div className="card">
              <h3>Letisztult felület</h3>
              <p>
                Nincsenek villogó dobozok, hirdetésblokkok, random popupok.
                Egy koncentrált nézet, ahol minden elemnek oka van.
              </p>
            </div>

            <div className="card">
              <h3>Tiszta fókusz</h3>
              <p>
                Nem egy téma felkapottságára, hanem az összképre fókuszál – segít látni,
                mi dominálja valójában a napot.
              </p>
            </div>

            <div className="card">
              <h3>Fejlesztői szemlélet</h3>
              <p>
                Az Utom nem kampánytermék. Folyamatosan csiszolt rendszer,
                ahol a logika, a tiszta adat és a UX van első helyen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VONAL */}
      <div className="section-divider" />

      {/* CTA */}
      <section className="section last">
        <div className="section-inner center">
          <h2>Készen állsz belépni?</h2>
          <p>
            Ha eleged van abból, hogy több helyről kell összerakni, mi történik az országban,
            az Utom arra készült, hogy ezt levenné a válladról.
          </p>
          <button className="primary-btn large" onClick={enter}>
            Belépek az Utom.hu-ra
          </button>
        </div>
      </section>

    </div>
  );
}
