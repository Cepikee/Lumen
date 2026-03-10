"use client";

import React, { JSX } from "react";
import "/styles/impresszum.css";

export default function Impresszum(): JSX.Element {
  const lastUpdated = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="impresszum-wrapper">
      <div className="impresszum-container">
        <header className="impresszum-header">
          <h1>Impresszum</h1>
          <p className="impresszum-updated">Frissítve: {lastUpdated}</p>
        </header>

        <section>
          <h2>Szolgáltató adatai</h2>
          <p><strong>Név:</strong> Lakatos Márk</p>
          <p><strong>Jelenlegi jogi státusz:</strong> magánszemély (a későbbiekben egyéni vállalkozóként kerül bejegyzésre)</p>
          <p><strong>Székhely (ország):</strong> Magyarország</p>
          <p><strong>E‑mail:</strong> <a href="mailto:support@utom.hu">support@utom.hu</a></p>
          <p><strong>Weboldal:</strong> <a href="https://utom.hu">utom.hu</a></p>
          <p><strong>Megjegyzés:</strong> Amint a szolgáltatás üzleti formája változik (egyéni vállalkozó / cég), a pontos cégadatok (székhely, adószám, cégjegyzékszám) a weboldalon és az Impresszumban közzétételre kerülnek.</p>
        </section>

        <section>
          <h2>Felelős szerkesztő</h2>
          <p><strong>Név:</strong> Lakatos Márk</p>
          <p><strong>Kapcsolat:</strong> <a href="mailto:support@utom.hu">support@utom.hu</a></p>
        </section>

        <section>
          <h2>Szolgáltatás jellege</h2>
          <p>
            Az <strong>Utom.hu</strong> egy automatizált, mesterséges intelligencia által működtetett hírszolgáltató és összefoglaló platform. A rendszer nyilvános forrásokból gyűjt információkat, rendszerezi és AI‑alapú eljárásokkal rövid, áttekintő tartalmakat készít.
          </p>
          <p>
            Minden közzétett anyag AI‑generáltként van jelölve, és a cikkekben a források mindig fel vannak tüntetve (a címben kattintható link formájában).
          </p>
        </section>

        <section>
          <h2>Jognyilatkozat és felelősség</h2>
          <p>
            A Szolgáltatás által előállított tartalmak algoritmikus feldolgozás eredményei; nem minősülnek szerkesztett újságírói munkának. A Szolgáltató nem vállal felelősséget a külső források tartalmáért, valamint az AI‑rendszer esetleges pontatlanságaiért.
          </p>
          <p>
            A felhasználó a tartalmakat saját felelősségére használja; a Szolgáltató nem vállal felelősséget közvetett károkért, üzleti veszteségekért vagy elmaradt haszonért, kivéve, ha jogszabály ettől eltérően rendelkezik.
          </p>
        </section>

        <section>
          <h2>Adatvédelem és sütik</h2>
          <p>
            Az adatkezelés részletes szabályait az <a href="/adatvedelem">Adatvédelmi Tájékoztató</a> tartalmazza. A weboldal Google Analytics szolgáltatást használ analitika céljából; ahol lehetséges, az analitika anonimizálásra és rövidebb adatmegőrzési időre van konfigurálva.
          </p>
          <p>
            A személyes adatok kezelése során a Szolgáltató a vonatkozó adatvédelmi jogszabályokat (GDPR) betartja. Az érzékeny adatok védelme érdekében az adatbázisban tárolt adatok titkosítva vannak.
          </p>
        </section>

        <section>
          <h2>AI‑átláthatóság és minőségbiztosítás</h2>
          <p>
            Minden publikált szöveg AI‑alapú generálással készül. A Szolgáltató belső ellenőrzési folyamatokat alkalmaz (plágiumellenőrzés és egyéb minőségellenőrzési lépések), hogy csökkentse a jogi kockázatokat és a nyilvánosságra hozott tartalmak pontatlanságát.
          </p>
          <p>
            A Szolgáltató DPIA (Adatvédelmi Hatásvizsgálat) elkészítését megkezdte; a DPIA összefoglalója és a kapcsolódó dokumentáció kérésre rendelkezésre áll.
          </p>
        </section>

        <section>
          <h2>Szellemi tulajdon</h2>
          <p>
            A weboldalon megjelenő tartalmak szerzői jogi védelem alatt állhatnak. A tartalmak jogosulatlan tömeges másolása, terjesztése vagy kereskedelmi felhasználása tilos. A források és a szerzői jogi státusz minden cikknél jelölve van.
          </p>
        </section>

        <section>
          <h2>Előfizetés és fizetések</h2>
          <p>
            A prémium előfizetéses szolgáltatás fejlesztés alatt áll. A fizetős szolgáltatások bevezetésekor a díjak, számlázás és lemondási feltételek részletesen közzétételre kerülnek az ÁSZF‑ben.
          </p>
        </section>

        <section>
          <h2>Panaszkezelés és ügyfélszolgálat</h2>
          <p>
            Panaszok és jogérvényesítési igények bejelentésére: <strong><a href="mailto:support@utom.hu">support@utom.hu</a></strong>.
            A Szolgáltató a bejelentésekre törekszik 14 napon belül válaszolni.
          </p>
        </section>

        <section>
          <h2>Szolgáltatás üzemeltetése és tárhely</h2>
          <p>
            A weboldal üzemeltetése és tárhelyszolgáltatása külső szolgáltatón keresztül történik. A szolgáltató és a tárhelyszolgáltató adatai a későbbi jogi státusz pontosítása után kerülnek közzétételre.
          </p>
        </section>

        <section>
          <h2>Jogviták és alkalmazandó jog</h2>
          <p>
            Jelen impresszumra és a weboldal használatára a magyar jog az irányadó. A felek elsődlegesen békés úton törekednek a viták rendezésére; amennyiben ez nem vezet eredményre, a jogviták eldöntésére a Szolgáltató székhelye szerinti illetékes magyar bíróság jogosult.
          </p>
        </section>

        <section>
          <h2>Változások és közzététel</h2>
          <p>
            A Szolgáltató fenntartja a jogot az Impresszum és a kapcsolódó jogi dokumentumok módosítására. A módosítások közzétételét követően azok hatályba lépnek; a fontos változásokról a felhasználókat a weboldalon tájékoztatjuk.
          </p>
        </section>

         <footer className="legal-footer">
          <p>© {new Date().getFullYear()} Utom.hu – Minden jog fenntartva.</p>
          <nav className="legal-footer-nav">
            <a href="/aszf">ÁSZF</a>
            <a href="/adatvedelem">Adatvédelmi Nyilatkozat</a>
            <a href="/">Főoldal</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
