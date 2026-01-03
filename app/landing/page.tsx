"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
{/* TREND + TRUST BLOKK EGYMÁS MELLETT */}
<section className="section">
  <div className="section-inner two-columns">

    {/* --- TRENDEK BLOKK (változatlan) --- */}
    <div className="trend-static icons refined">
      <header className="trend-header center">
        <h2>A rendszer fő képességei</h2>
        <p className="lead">Három technológiai pillér, amelyre az Utom elemzőmotorja épül.</p>
      </header>

      <div className="cards">
        {/* Bal: Elemzés */}
        <article className="card">
          <div className="icon-wrap">
            <Image src="/data-analysis-svgrepo-com.svg" alt="Elemzés ikon" width={120} height={120} className="img-logo" />
          </div>
          <div className="card-body">
            <h4 className="card-title">Elemzés</h4>
            <p className="card-desc">
              A rendszer automatikusan felismeri, ha több, nagyon hasonló hír jelenik meg.
            </p>
            <ul className="card-features emphasized">
              <li>Duplikátumok összefésülése</li>
              <li>Forráskonzisztencia ellenőrzése</li>
              <li>Prioritás a teljes, hiteles beszámolónak</li>
            </ul>
          </div>
        </article>

        {/* Közép */}
        <article className="card">
          <div className="icon-wrap">
            <Image src="/availability-svgrepo-com.svg" alt="Forrásegyensúly ikon" width={120} height={120} className="img-logo" />
          </div>
          <div className="card-body">
            <h4 className="card-title">Forrásegyensúly</h4>
            <p className="card-desc">
              Több tucat magyar portálból gyűjtünk, így csökken a torzítás.
            </p>
            <ul className="card-features emphasized">
              <li>Sokforrású aggregáció</li>
              <li>Kiegyensúlyozott nézet</li>
              <li>Forrás‑átláthatóság</li>
            </ul>
          </div>
        </article>

        {/* Jobb */}
        <article className="card">
          <div className="icon-wrap">
            <Image src="/machine-vision-svgrepo-com.svg" alt="Időbeli változás ikon" width={120} height={120} className="img-logo" />
          </div>
          <div className="card-body">
            <h4 className="card-title">Időbeli változás</h4>
            <p className="card-desc">
              A rendszer kimutatja, hogyan változnak a trendek időben.
            </p>
            <ul className="card-features emphasized">
              <li>Idősoros kimutatások</li>
              <li>Kulcsszó‑trendek</li>
              <li>Napi dinamika</li>
            </ul>
          </div>
        </article>
      </div>
    </div>

   {/* --- ÚJ BLOKK: MIÉRT MEGBÍZHATÓ AZ UTOM? --- */}
<div className="trend-static icons refined">
  <header className="trend-header center">
    <h2>Mitől prémium az Utom?</h2>
    <p className="lead">Három élményközpontú előny, amely megkülönbözteti a hagyományos hírgyűjtőktől.</p>
  </header>

  <div className="cards">

    {/* Bal: Prémium élmény */}
    <article className="card">
      <div className="icon-wrap">
        <Image
          src="/ai-science-spark.svg"
          alt="Prémium élmény ikon"
          width={120}
          height={120}
          className="img-logo"
        />
      </div>

      <div className="card-body">
        <h4 className="card-title">Prémium élmény</h4>
        <p className="card-desc">
          Letisztult felület, amely a lényeget emeli ki : felesleges zaj nélkül.
        </p>

        <ul className="card-features emphasized">
          <li>Gyors, letisztult felület</li>
          <li>Intelligens kiemelések</li>
          <li>Minimális zaj, maximális lényeg</li>
        </ul>
      </div>
    </article>

    {/* Közép: Rendszer-integritás */}
    <article className="card">
      <div className="icon-wrap">
        <Image
          src="/shield-2.svg"
          alt="Rendszer-integritás ikon"
          width={120}
          height={120}
          className="img-logo"
        />
      </div>

      <div className="card-body">
        <h4 className="card-title">Rendszer‑integritás</h4>
        <p className="card-desc">
          Stabil, hibamentes működésre tervezett háttérrendszer, amely folyamatosan ellenőrzi önmagát.
        </p>

        <ul className="card-features emphasized">
          <li>Automatikus minőségellenőrzések</li>
          <li>Stabil, kiszámítható működés</li>
          <li>Megbízható háttérfolyamatok</li>
        </ul>
      </div>
    </article>

    {/* Jobb: AI-alapú működés */}
    <article className="card">
      <div className="icon-wrap">
        <Image
          src="/cloud-check-flat.svg"
          alt="AI-alapú működés ikon"
          width={120}
          height={120}
          className="img-logo"
        />
      </div>

      <div className="card-body">
        <h4 className="card-title">AI‑alapú működés</h4>
        <p className="card-desc">
          Az Utom mesterséges intelligenciával dolgozza fel a híreket emberi beavatkozás nélkül, valós időben.
        </p>

        <ul className="card-features emphasized">
          <li>Automatikus tartalomelemzés</li>
          <li>Valós idejű felismerések</li>
          <li>Öntanuló működés</li>
        </ul>
      </div>
    </article>

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
