import Link from "next/link";

const features = [
  ["01", "Egy történet, több forrás", "Hasonlítsd össze a forrásokat, és lásd együtt a közös és eltérő állításokat."],
  ["02", "Előzmények és idővonal", "Kövesd végig, hogyan alakult egy történet, és mi előzte meg a legfrissebb hírt."],
  ["03", "Eltérések, bizonyítékokkal", "Tekintsd át a konfliktusokat, a kapcsolódó szereplőket és az állítások forrásait."],
];
export default function PremiumPage() {
  return <div className="premium-product">
    <section className="premium-intro" aria-labelledby="premium-title">
      <div>
        <p className="premium-eyebrow">UTOM / PRÉMIUM</p>
        <h1 id="premium-title">A hír csak<br /><span>a történet kezdete.</span></h1>
        <p className="premium-lead">Források, előzmények és összefüggések. Nézd meg, mi áll a hírek mögött — egy áttekinthető felületen.</p>
        <a className="premium-link" href="#premium-plans">Csomagok összehasonlítása <span aria-hidden="true">↓</span></a>
      </div>
      <aside className="premium-value" aria-label="A Prémium értéke">
        <p className="premium-eyebrow">TÖBB NÉZŐPONT. TÖBB KONTEXTUS.</p>
        <h2>Mi történt?<br /><span>És mi van mögötte?</span></h2>
        <div className="premium-value-line"><span>Források</span><strong>Egymás mellett</strong></div>
        <div className="premium-value-line"><span>Előzmények</span><strong>Időrendben</strong></div>
        <div className="premium-value-line"><span>Állítások</span><strong>Bizonyítékhoz kötve</strong></div>
      </aside>
    </section>
    <section className="premium-features" aria-label="Prémium funkciók">
      {features.map(([number, title, description]) => <article key={number}>
        <span className="premium-eyebrow">{number}</span><h2>{title}</h2><p>{description}</p>
      </article>)}
    </section>
    <section id="premium-plans" aria-labelledby="plans-title">
      <div className="premium-section-heading"><div><p className="premium-eyebrow">HOZZÁFÉRÉS</p><h2 id="plans-title">Válaszd a saját ritmusod.</h2></div><p>Az előfizetés és a próbaidő jelenleg nem érhető el.</p></div>
      <div className="premium-plans">
        <article className="premium-plan"><h3>Havi Prémium</h3><p className="premium-price">1000 Ft <span>/ hó</span></p><p>Havi díjas hozzáférés a Prémium nézetekhez.</p><ul><li>Források összehasonlítása</li><li>Előzmények és idővonalak</li></ul><button type="button" disabled>Jelenleg nem elérhető</button></article>
        <article className="premium-plan premium-plan-featured"><span className="premium-offer">Legjobb ár</span><h3>Éves Prémium</h3><p className="premium-price">9000 Ft <span>/ év</span></p><p>Havi 750 Ft-nak megfelelő éves díj.</p><ul><li>Források összehasonlítása és idővonalak</li><li>Közös és eltérő állítások</li><li>Konfliktusok és kapcsolódó szereplők</li></ul><button type="button" disabled>Jelenleg nem elérhető</button></article>
      </div>
      <div className="premium-secondary"><article><h3>Támogató</h3><p>Támogasd az Utom független hírelemző projektjét.</p><button type="button" disabled>A támogatás jelenleg nem érhető el</button></article><article><h3>Cégeknek</h3><p>A céges csomag részletei és az API-hozzáférés még nem érhető el.</p><button type="button" disabled>Jelenleg nem elérhető</button></article></div>
      <p className="premium-footnote">Kérdésed van? <Link href="/premium-faq">Prémium tudnivalók</Link></p>
    </section>
  </div>;
}
