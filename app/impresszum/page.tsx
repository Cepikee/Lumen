"use client";

import React, { JSX } from "react";
import "/styles/impresszum.css";

export default function Impresszum(): JSX.Element {
  return (
    <main className="impresszum-wrapper">
      <div className="impresszum-container">

        <header className="impresszum-header">
          <h1>Impresszum</h1>
        </header>

        <section>
          <h2>Szolgáltató adatai</h2>
          <p><strong>Név:</strong> Lakatos Márk (egyéni vállalkozó)</p>
          <p><strong>Székhely:</strong> Magyarország</p>
          <p><strong>E-mail:</strong> support@utom.hu</p>
        </section>

        <section>
          <h2>A szolgáltatás jellege</h2>
          <p>
            Az <strong>Utom.hu</strong> egy független, mesterséges intelligencia
            által működtetett, automatizált hírgyártó és híradó platform.
          </p>
          <p>
            A megjelenített cikkek algoritmikus feldolgozás eredményeként jönnek létre.
            A tartalmak minden esetben AI-fogalmazásként kerülnek megjelölésre.
          </p>
          <p>
            Az egyes cikkek esetében az eredeti forrás feltüntetésre kerül,
            a címben kattintható módon.
          </p>
        </section>

        <section>
          <h2>Felelősségi nyilatkozat</h2>
          <p>
            Az Utom automatizált rendszerként működik.
            A közzétett tartalmak nem minősülnek szerkesztett újságírói tevékenységnek.
          </p>
          <p>
            A Szolgáltató nem vállal felelősséget a külső forrásoldalak
            tartalmáért, valamint az AI rendszer esetleges pontatlanságáért.
          </p>
        </section>

        <section>
          <h2>Előfizetés</h2>
          <p>
            Az Utom prémium előfizetéses szolgáltatást kínál.
            Az előfizetés feltételeit az Általános Szerződési Feltételek (ÁSZF) tartalmazzák.
          </p>
        </section>

        <section>
          <h2>Jogviták</h2>
          <p>
            Jelen szolgáltatásra a magyar jog az irányadó.
            Vitás kérdések esetén a felek elsődlegesen békés úton törekednek a rendezésre.
          </p>
        </section>

        <footer className="impresszum-footer">
          <p>© {new Date().getFullYear()} Utom.hu – Minden jog fenntartva.</p>
        </footer>

      </div>
    </main>
  );
}
