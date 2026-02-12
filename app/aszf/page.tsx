"use client";

import React, { JSX } from "react";
import "@/styles/aszf.css";

export default function ASZF(): JSX.Element {
  const lastUpdated = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="aszf-wrapper">
      <div className="aszf-container">

        <header className="aszf-header">
          <h1>Általános Szerződési Feltételek (ÁSZF)</h1>
          <p className="aszf-updated">Hatályos: {lastUpdated}</p>
        </header>

        <section>
          <h2>1. Szolgáltató</h2>
          <p>
            Az Utom.hu üzemeltetője: Lakatos Márk (a továbbiakban: Szolgáltató).
            Kapcsolattartás: <strong>support@utom.hu</strong>
          </p>
        </section>

        <section>
          <h2>2. A szolgáltatás jellege</h2>
          <p>
            Az Utom egy független, mesterséges intelligencia által működtetett,
            automatizált hírgyártó és híradó platform.
          </p>
          <p>
            A közzétett tartalmak algoritmikus feldolgozás eredményei,
            és nem minősülnek hagyományos szerkesztői vagy újságírói
            tevékenységnek.
          </p>
          <p>
            Minden cikk AI-fogalmazásként kerül megjelölésre,
            és a forrásoldal minden esetben feltüntetésre kerül,
            a címben kattintható formában.
          </p>
        </section>

        <section>
          <h2>3. Felelősségkorlátozás</h2>
          <p>
            A Szolgáltató nem garantálja a közzétett információk
            teljességét, pontosságát vagy naprakészségét.
          </p>
          <p>
            Az Utom által megjelenített tartalmak nem minősülnek
            jogi, pénzügyi, befektetési vagy egészségügyi tanácsadásnak.
          </p>
          <p>
            A platform használata kizárólag a felhasználó saját felelősségére történik.
          </p>
        </section>

        <section>
          <h2>4. Forrásmegjelölés</h2>
          <p>
            Az Utom minden közzétett tartalom esetében feltünteti az
            eredeti forrást. A forrás a címben kattintható módon elérhető.
          </p>
          <p>
            A Szolgáltató nem vállal felelősséget a hivatkozott
            külső oldalak tartalmáért.
          </p>
        </section>

        <section>
          <h2>5. Prémium előfizetés</h2>
          <p>
            Az Utom prémium előfizetéses szolgáltatást kínál.
          </p>
          <ul>
            <li>Az előfizetés díjköteles.</li>
            <li>A díjfizetés online fizetési szolgáltatón keresztül történik.</li>
            <li>Az előfizetés automatikusan megújulhat, amennyiben a felhasználó azt nem mondja le.</li>
            <li>A lemondás a fordulónap előtt kezdeményezhető.</li>
            <li>Az előfizetési díj időarányosan nem visszatérítendő.</li>
          </ul>
        </section>

        <section>
          <h2>6. Tiltott felhasználás</h2>
          <ul>
            <li>Automatizált adatgyűjtés (scraping)</li>
            <li>A rendszer túlterhelése</li>
            <li>A szolgáltatás visszaélésszerű használata</li>
          </ul>
        </section>

        <section>
          <h2>7. Tartalommal kapcsolatos bejelentések</h2>
          <p>
            Amennyiben egy közzétett tartalom személyiségi jogot,
            szerzői jogot vagy egyéb jogot sért,
            a bejelentés a <strong>support@utom.hu</strong> címen tehető meg.
          </p>
          <p>
            A Szolgáltató a bejelentéseket ésszerű határidőn belül kivizsgálja.
          </p>
        </section>

        <section>
          <h2>8. Szerzői jog</h2>
          <p>
            A platformon megjelenő AI által generált tartalom az Utom rendszerének
            működési eredménye. A tartalom jogosulatlan tömeges másolása,
            terjesztése vagy kereskedelmi felhasználása tilos.
          </p>
        </section>

        <section>
          <h2>9. Záró rendelkezések</h2>
          <p>
            A Szolgáltató jogosult az ÁSZF módosítására.
            A módosítás a közzététel napjától hatályos.
          </p>
          <p>
            Jelen ÁSZF-re a magyar jog az irányadó.
          </p>
        </section>

        <footer className="aszf-footer">
          <p>© {new Date().getFullYear()} Utom.hu</p>
        </footer>

      </div>
    </main>
  );
}
