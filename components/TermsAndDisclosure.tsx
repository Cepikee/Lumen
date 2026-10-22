import React from "react";

export default function TermsAndDisclosure() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", lineHeight: 1.6 }}>
      <h1>Felhasználási feltételek és működési nyilatkozat</h1>

      <section>
        <h2>1. Az oldal jellege</h2>
        <p>
          A szolgáltatás automatizált hírgyűjtő és elemző funkciókat működtet,
          valamint saját összefoglalókat és strukturált nézeteket készít. A
          szolgáltatás jogi besorolása külön szakértői vizsgálat tárgya; a
          technikai automatizálás önmagában nem dönti el ezt a kérdést.
        </p>
      </section>

      <section>
        <h2>2. Források és tartalomeredet</h2>
        <p>
          A rendszer RSS-metaadatokat és RSS-tartalmat dolgoz fel, továbbá egyes,
          előre nyilvántartott forrásoknál közvetlen cikkletöltést is használhat.
          Az eredeti teljes szöveget nem közli újra a nyilvános hírnézetben; a
          feldolgozás során azonban ideiglenes forrásadatként tárolhatja. A
          nyilvános összefoglalók mellett forrásnév és eredeti hivatkozás jelenik meg.
        </p>
      </section>

      <section>
        <h2>3. Mesterséges intelligencia használata</h2>
        <p>
          A szolgáltatás mesterséges intelligenciát alkalmaz az információk
          kivonatolására és egyszerűsítésére. Az AI nem hoz önálló döntéseket, nem
          alkot új tényeket, és nem minősül szerkesztőnek vagy újságírónak.
        </p>
      </section>

      <section>
        <h2>4. Átfogalmazás és plágiummegelőzés</h2>
        <p>
          A rendszer technikai plágiumellenőrzést alkalmaz. Amennyiben a
          generált szöveg hasonlósága egy előre meghatározott küszöbértéket
          meghalad, vagy hosszabb szó szerinti egyezés észlelhető, az összefoglaló
          publikációs ellenőrzési állapotba kerül. Ez technikai kockázatjelzés,
          nem jogi megfelelőségi minősítés.
        </p>
      </section>

      <section>
        <h2>5. Tartalmi korlátozások</h2>
        <p>
          Az oldalon megjelenő információk nem minősülnek jogi, pénzügyi,
          egészségügyi vagy befektetési tanácsnak. A felhasználó tudomásul veszi,
          hogy a tartalom kizárólag tájékoztató és elemző jellegű.
        </p>
      </section>

      <section>
        <h2>6. Kockázatjelzés és átláthatóság</h2>
        <p>
          A rendszer AI-jelölést, forrásmegjelölést és eredeti cikkre mutató
          hivatkozást alkalmaz a támogatott nyilvános nézetekben. A szolgáltatás nem
          garantálja a teljességet vagy a hibátlan értelmezést.
        </p>
      </section>

      <section>
        <h2>7. Jóhiszemű működés</h2>
        <p>
          A rendszer technikai kockázatcsökkentő kontrollokat alkalmaz. Ezek nem
          helyettesítik a forrásonkénti engedélyek, felhasználási feltételek és a
          szolgáltatás jogi besorolásának szakértői ellenőrzését.
        </p>
      </section>

      <section>
        <h2>8. Befektetői összefoglaló</h2>
        <p>
          A platform célja értéknövelt elemző réteg biztosítása. A működés
          forrásmegjelölésre, önálló összefoglalókra és az eredeti cikk
          megnyitására épül. A fennmaradó szerzői jogi és reputációs kockázatokat
          forrásonként és jogi szakértővel kell értékelni.
        </p>
      </section>

      <section>
        <h2>9. Záró rendelkezések</h2>
        <p>
          A szolgáltatás használatával a felhasználó elfogadja a jelen
          feltételeket. A feltételek időről időre frissülhetnek a jogszabályi és
          technológiai környezet változásának megfelelően.
        </p>
      </section>
    </main>
  );
}
