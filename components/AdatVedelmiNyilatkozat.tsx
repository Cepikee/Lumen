"use client";

import React, { JSX } from "react";
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

        {/* Header */}
        <header className="legal-header">
          <img src="/utomlogo.png" alt="Utom" className="legal-logo" />
          <h1>Adatvédelmi Nyilatkozat</h1>
          <p className="legal-updated">
            Hatályos: {lastUpdated}
          </p>
        </header>

        {/* Intro */}
        <section className="legal-section">
          <p>
            Az <strong>Utom.hu</strong> elkötelezett a személyes adatok védelme mellett.
            Jelen dokumentum részletesen ismerteti, hogyan gyűjtjük,
            kezeljük és védjük a felhasználók adatait a 2026-os GDPR és
            európai adatvédelmi irányelveknek megfelelően.
          </p>
        </section>

        {/* 1 */}
        <section className="legal-section">
          <h2>1. Adatkezelő adatai</h2>
          <ul>
            <li><strong>Név:</strong> Lakatos Márk (egyéni vállalkozó)</li>
            <li><strong>Székhely:</strong> Magyarország</li>
            <li><strong>Email:</strong> info@utom.hu</li>
            <li><strong>Adatvédelem:</strong> privacy@utom.hu</li>
          </ul>
        </section>

        {/* 2 */}
        <section className="legal-section">
          <h2>2. Kezelt adatok köre</h2>
          <ul>
            <li>Regisztrációs adatok (név, e-mail, titkosított jelszó)</li>
            <li>Előfizetési és számlázási adatok</li>
            <li>Technikai adatok (IP, eszközinformáció, naplók)</li>
            <li>Használati statisztikák</li>
          </ul>
          <p className="legal-note">
            Bankkártyaadatot az Utom.hu nem tárol – azt kizárólag a fizetési szolgáltató kezeli.
          </p>
        </section>

        {/* 3 */}
        <section className="legal-section">
          <h2>3. Az adatkezelés jogalapja</h2>
          <ul>
            <li>Szerződés teljesítése</li>
            <li>Jogi kötelezettség</li>
            <li>Jogos érdek</li>
            <li>Hozzájárulás</li>
          </ul>
        </section>

        {/* 4 */}
        <section className="legal-section">
          <h2>4. Adatmegőrzési idő</h2>
          <ul>
            <li>Fiókadatok: törlésig + 30 nap biztonsági mentés</li>
            <li>Naplófájlok: 30 nap</li>
            <li>Használati adatok: 180 nap</li>
            <li>Számlázás: 8 év (jogszabály szerint)</li>
          </ul>
        </section>

        {/* 5 */}
        <section className="legal-section">
          <h2>5. Felhasználói jogok</h2>
          <p>A felhasználót megilleti:</p>
          <ul>
            <li>Hozzáférés joga</li>
            <li>Helyesbítés joga</li>
            <li>Törlés joga</li>
            <li>Adatkezelés korlátozása</li>
            <li>Adathordozhatóság</li>
            <li>Tiltakozás joga</li>
          </ul>
          <a href="mailto:privacy@utom.hu" className="legal-button">
            Adatvédelmi kérelem benyújtása
          </a>
        </section>

        {/* 6 */}
        <section className="legal-section">
          <h2>6. Harmadik felek</h2>
          <p>
            Az Utom.hu adatfeldolgozó partnereket vesz igénybe (pl. tárhelyszolgáltató,
            Stripe/Barion fizetési szolgáltató). Az adatokat nem értékesítjük.
          </p>
        </section>

        {/* 7 */}
        <section className="legal-section">
          <h2>7. Adatbiztonság</h2>
          <ul>
            <li>HTTPS titkosítás</li>
            <li>Hash-elt jelszótárolás</li>
            <li>Hozzáférés-kontroll</li>
            <li>Incidenskezelési protokoll</li>
          </ul>
        </section>

        {/* 8 */}
        <section className="legal-section">
          <h2>8. Sütik (Cookie-k)</h2>
          <p>
            Az oldal működéséhez szükséges sütiket használunk.
            Analitikai sütik kizárólag hozzájárulás esetén aktiválódnak.
          </p>
        </section>

        {/* Footer */}
        <footer className="legal-footer">
          <p>© {new Date().getFullYear()} Utom.hu – Minden jog fenntartva.</p>
          <a href="/">Vissza a Fő oldalra</a>
        </footer>

      </div>
    </main>
  );
}
