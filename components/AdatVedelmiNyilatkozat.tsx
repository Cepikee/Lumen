"use client";

import React, { JSX } from "react";
import Image from "next/image";
import "../styles/adatvedelem.css";

export default function AdatvedelmiNyilatkozat(): JSX.Element {
  const lastUpdated = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="legal-wrapper">
      <div className="legal-container">
        <header className="legal-header">
          <div className="legal-header-top">
            <Image
              src="/web-app-manifest-512x512.png"
              alt="Utom logó"
              width={56}
              height={56}
              className="legal-logo"
              priority
            />
            <div>
              <h1>Adatvédelmi Nyilatkozat</h1>
              <p className="legal-updated">Hatályos: {lastUpdated}</p>
            </div>
          </div>
          <p className="legal-lead">
            Az Utom.hu elkötelezett a személyes adatok védelme mellett. Ez a nyilatkozat
            összefoglalja, hogyan gyűjtjük, kezeljük és védjük a felhasználók adatait a
            vonatkozó jogszabályok és a jó adatvédelmi gyakorlat szerint.
          </p>
        </header>

        <section className="legal-section" id="adatkezelo">
          <h2>1. Adatkezelő</h2>
          <ul>
            <li><strong>Név:</strong> Lakatos Márk</li>
            <li><strong>Jelenlegi jogi státusz:</strong> magánszemély (később egyéni vállalkozóként kerül feltüntetésre)</li>
            <li><strong>Ország:</strong> Magyarország</li>
            <li><strong>Általános kapcsolat:</strong> <a href="mailto:support@utom.hu">support@utom.hu</a></li>
            <li><strong>Adatvédelmi ügyek:</strong> <a href="mailto:support@utom.hu">support@utom.hu</a></li>
          </ul>
        </section>

        <section className="legal-section" id="kezelt-adatok">
          <h2>2. Kezelt adatok köre</h2>
          <p>A Szolgáltatás a következő adattípusokat dolgozza fel, az adott funkciótól függően:</p>
          <ul>
            <li>Regisztrációs adatok: név, e‑mail cím, titkosított jelszó (ha regisztráció történik).</li>
            <li>Technikai adatok: IP cím (anonimizálva ahol lehetséges), böngésző és eszközinformációk, naplók.</li>
            <li>Használati adatok: oldalletöltések, keresési lekérdezések, interakciók (analitika).</li>
            <li>Tartalomhoz kapcsolódó metaadatok: források, cikkek URL‑jei, publikálási időpontok.</li>
            <li>Számlázási adatok: csak akkor kerülnek kezelésre, ha a fizetős szolgáltatás bevezetésre kerül (a fizetési adatok bankkártya‑adatait a fizetési szolgáltató kezeli).</li>
          </ul>
          <p className="legal-note">Megjegyzés: bankkártyaadatokat az Utom.hu nem tárol; azokat kizárólag a választott fizetési szolgáltató kezeli.</p>
        </section>

        <section className="legal-section" id="jogalap">
          <h2>3. Az adatkezelés jogalapja és céljai</h2>
          <ul>
            <li><strong>Szerződés teljesítése:</strong> előfizetés vagy szolgáltatás nyújtása esetén.</li>
            <li><strong>Jogi kötelezettség:</strong> jogszabályoknak való megfelelés (pl. számlázás).</li>
            <li><strong>Jogos érdek:</strong> szolgáltatás működtetése, csalások és visszaélések megelőzése, biztonság.</li>
            <li><strong>Hozzájárulás:</strong> analitika és marketing célú sütik esetén (a felhasználó hozzájárulása alapján).</li>
          </ul>
        </section>

        <section className="legal-section" id="adatmegorzes">
          <h2>4. Adatmegőrzési idő</h2>
          <ul>
            <li>Fiókadatok: a felhasználó törléséig, majd további 30 nap biztonsági mentés céljából.</li>
            <li>Naplófájlok (technikai): 30 nap, kivéve ha jogi vagy biztonsági okok indokolják a hosszabb megőrzést.</li>
            <li>Használati/analitikai adatok: 180 nap (összesített, anonimizált adatok hosszabb ideig megőrizhetők).</li>
            <li>Számlázási adatok: 8 év (adójogszabályoknak megfelelően).</li>
          </ul>
        </section>

        <section className="legal-section" id="adatvedelmi-jogok">
          <h2>5. Az érintett jogai</h2>
          <p>A felhasználót megilletik a GDPR szerinti jogok. Ezek gyakorlásához írj a <a href="mailto:support@utom.hu">support@utom.hu</a> címre vagy használd az alábbi gyorslinket:</p>
          <ul>
            <li>Hozzáférés joga (tudni, milyen adatokat kezelünk rólad).</li>
            <li>Helyesbítés joga (pontatlan adatok javítása).</li>
            <li>Törlés joga (az adatok törlése, ahol jogszerűen lehetséges).</li>
            <li>Adatkezelés korlátozásának joga.</li>
            <li>Adathordozhatóság joga.</li>
            <li>Tiltakozás joga az adatkezelés ellen.</li>
            <li>Hozzájárulás visszavonása (ha a kezelés hozzájáruláson alapul).</li>
          </ul>
          <a href="mailto:support@utom.hu" className="legal-button">Adatvédelmi kérelem benyújtása</a>
        </section>

        <section className="legal-section" id="harmadik-felek">
          <h2>6. Harmadik felek és adatfeldolgozók</h2>
          <p>
            A Szolgáltatás működtetéséhez külső adatfeldolgozókat veszünk igénybe. Jelenleg példáként:
          </p>
          <ul>
            <li>Tárhely és infrastruktúra: külső felhőszolgáltató (a pontos szolgáltató a jogi státusz frissítésekor kerül közzétételre).</li>
            <li>Analitika: Google Analytics (az analitika anonimizálásra és adatmegőrzési korlátozásra van konfigurálva).</li>
            <li>Fizetési szolgáltatók: a fizetési adatok kezelése a választott szolgáltatón keresztül történik (pl. Stripe, Barion — ha bevezetésre kerülnek).</li>
          </ul>
          <p className="legal-note">Az adatokat nem értékesítjük harmadik félnek. Minden adatfeldolgozóval adatfeldolgozási szerződés (DPA) kerül megkötésre, ahol az szükséges.</p>
        </section>

        <section className="legal-section" id="adatbiztonsag">
          <h2>7. Adatbiztonság</h2>
          <p>A Szolgáltató technikai és szervezeti intézkedéseket alkalmaz az adatok védelmére:</p>
          <ul>
            <li>HTTPS minden forgalomhoz.</li>
            <li>Adatbázis‑szintű titkosítás érzékeny adatoknál.</li>
            <li>Hash‑elt és sózott jelszótárolás.</li>
            <li>Hozzáférés‑kontroll és jogosultságkezelés.</li>
            <li>Rendszeres biztonsági mentések és naplózás.</li>
            <li>Incidenskezelési protokoll és értesítési eljárás.</li>
          </ul>
        </section>

        <section className="legal-section" id="sutik">
          <h2>8. Sütik (Cookie‑k)</h2>
          <p>
            A weboldal működéséhez szükséges sütik automatikusan aktiválódnak. Analitikai és marketing sütik
            csak a felhasználó hozzájárulása esetén kerülnek aktiválásra. A sütik kezeléséről és a hozzájárulás
            visszavonásáról részletes információ a <a href="/adatvedelem">részletes Adatvédelmi Tájékoztatóban</a> található.
          </p>
        </section>

        <section className="legal-section" id="ai-feldolgozas">
          <h2>9. AI‑feldolgozás, átláthatóság és DPIA</h2>
          <p>
            Az Utom.hu AI‑algoritmusokat használ nyilvános források feldolgozására, tartalmak rendszerezésére és AI‑generált összefoglalók előállítására. Minden AI‑generált tartalom egyértelműen jelölve van.
          </p>
          <p>
            A Szolgáltató belső minőségellenőrzési lépéseket alkalmaz (plágiumellenőrzés, forrásellenőrzés), hogy csökkentse a pontatlanság és jogi kockázat lehetőségét.
          </p>
          <p>
            A Szolgáltató DPIA (Adatvédelmi Hatásvizsgálat) elkészítését megkezdte az AI‑feldolgozásokra vonatkozóan. A DPIA összefoglalója a Szolgáltató rendelkezésére áll, és kérésre tájékoztatást adunk a releváns intézkedésekről.
          </p>
        </section>

        <section className="legal-section" id="panasz">
          <h2>10. Panaszkezelés és kapcsolattartás</h2>
          <p>
            Panaszok és adatvédelmi kérelmek benyújtása: <a href="mailto:support@utom.hu">support@utom.hu</a> vagy <a href="mailto:support@utom.hu">support@utom.hu</a>.
            A Szolgáltató törekszik arra, hogy a bejelentésekre 14 napon belül válaszoljon.
          </p>
          <p>
            Ha az érintett úgy ítéli meg, hogy jogai sérültek, panaszt tehet a magyar adatvédelmi hatóságnál (NAIH).
          </p>
        </section>

        <section className="legal-section" id="valtozasok">
          <h2>11. Változások és közzététel</h2>
          <p>
            A Szolgáltató fenntartja a jogot az Adatvédelmi Nyilatkozat módosítására. A változásokat a weboldalon közzétesszük; a fontos módosításokról a felhasználókat értesítjük.
          </p>
        </section>

        <footer className="legal-footer">
          <p>© {new Date().getFullYear()} Utom.hu – Minden jog fenntartva.</p>
          <nav className="legal-footer-nav">
            <a href="/aszf">ÁSZF</a>
            <a href="/impresszum">Impresszum</a>
            <a href="/">Főoldal</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
