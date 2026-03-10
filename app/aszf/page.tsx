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
          <h2>1. Bevezetés és definíciók</h2>
          <p>
            Jelen Általános Szerződési Feltételek (a továbbiakban: <strong>ÁSZF</strong>) az
            <strong> Utom.hu</strong> szolgáltatás (a továbbiakban: <strong>Szolgáltatás</strong>)
            igénybevételének általános feltételeit tartalmazzák. A Szolgáltató: <strong>Lakatos
            Márk / Utom.hu</strong>. Kapcsolattartó: <strong>support@utom.hu</strong>.
          </p>
          <p>
            <strong>Felhasználó:</strong> minden természetes vagy jogi személy, aki a Szolgáltatást
            igénybe veszi. <strong>Fiók:</strong> a regisztrált felhasználói profil. <strong>Tartalom:</strong>
            a Szolgáltatáson megjelenő cikkek, összefoglalók, metaadatok és egyéb anyagok. <strong>AI‑tartalom:</strong>
            a Szolgáltatás által automatikusan, mesterséges intelligencia segítségével előállított szöveg.
          </p>
          <p>
            Jelen ÁSZF a Szolgáltatás minden felhasználójára kötelező, kivéve, ha a felek között
            külön írásbeli megállapodás jön létre.
          </p>
        </section>

        <section>
          <h2>2. A szolgáltatás tárgya és jellege</h2>
          <p>
            Az Utom.hu egy automatizált hírszolgáltató platform, amely AI‑algoritmusokkal dolgozza fel
            nyilvános forrásokból származó információkat, és ezek alapján generál rövid összefoglalókat,
            címeket és metaadatokat. A Szolgáltatás célja tájékoztatás, gyors áttekintés biztosítása.
          </p>
          <p>
            A közzétett anyagok jellege algoritmikus; nem helyettesítik a szakértői, jogi, orvosi,
            pénzügyi vagy egyéb személyre szabott tanácsadást. A felhasználó felelőssége, hogy a
            tartalmat saját megítélése szerint használja.
          </p>
        </section>

        <section>
          <h2>3. Regisztráció, fiók és hozzáférés</h2>
          <p>
            A Szolgáltatás egyes funkciói regisztrációhoz kötöttek. A regisztráció során a Felhasználó
            valós, pontos és naprakész adatokat köteles megadni. A jelszó és fiók biztonságáért a
            Felhasználó felelős.
          </p>
          <ul>
            <li>A fiók jogosulatlan használatából eredő károkért a fiók tulajdonosa felel.</li>
            <li>A Szolgáltató jogosult a fiókot felfüggeszteni vagy törölni, ha a Felhasználó megsérti az ÁSZF‑et.</li>
            <li>A fiók törlésére vonatkozó kérést a Szolgáltató a vonatkozó jogszabályoknak megfelelően kezeli.</li>
          </ul>
        </section>

        <section>
          <h2>4. Előfizetés és fizetési feltételek (átmeneti rendelkezés)</h2>
          <p>
            Jelenleg az előfizetéses modul fejlesztés alatt áll; a fizetős szolgáltatások és csomagok
            bevezetéséről a Szolgáltató külön tájékoztatást ad. Az alábbiak a későbbi bevezetésre
            előkészített szabályok sablonjai:
          </p>
          <ul>
            <li>Az előfizetés díjköteles, a díjakat és a számlázás módját a Szolgáltató a weboldalon teszi közzé.</li>
            <li>Az előfizetés automatikusan megújulhat, ha a Felhasználó azt nem mondja le a megadott határidőig.</li>
            <li>Lemondás esetén a lemondás hatálya és a visszatérítés szabályai a bevezetéskor részletesen kerülnek meghatározásra.</li>
            <li>Promóciók és próbaidőszakok külön feltételekhez kötöttek, amelyeket a Szolgáltató külön közöl.</li>
          </ul>
          <p>
            A fizetési szolgáltatók és a számlázás részletei a szolgáltatás bevezetésekor kerülnek
            közzétételre. Jelenleg a Felhasználó semmilyen fizetési kötelezettséget nem vállal.
          </p>
        </section>

        <section>
          <h2>5. Felhasználói kötelezettségek és tiltott magatartás</h2>
          <p>
            A Felhasználó köteles a Szolgáltatást jogszerűen, a jóhiszeműség és a tisztesség követelményeinek
            megfelelően használni.
          </p>
          <p>Tiltott magatartások különösen (nem kizárólagosan):</p>
          <ul>
            <li>automatikus adatgyűjtés (scraping) a Szolgáltatás engedélye nélkül;</li>
            <li>a Szolgáltatás túlterhelése, DDoS jellegű tevékenység;</li>
            <li>jogsértő, gyűlöletkeltő, erőszakra uszító vagy mások jogait sértő tartalom közzététele;</li>
            <li>más felhasználók személyes adatainak jogosulatlan gyűjtése vagy közzététele;</li>
            <li>a Szolgáltatás biztonságát veszélyeztető tevékenységek.</li>
          </ul>
          <p>
            A tiltott magatartás észlelése esetén a Szolgáltató jogosult a Felhasználó hozzáférését
            korlátozni, felfüggeszteni vagy törölni, valamint jogi lépéseket kezdeményezni.
          </p>
        </section>

        <section>
          <h2>6. Tartalomkezelés, forrásmegjelölés és szerzői jog</h2>
          <p>
            A Szolgáltatás a forrásokat minden esetben megjelöli: a cikk címében vagy metaadatában
            hivatkozott forrásra mutató link található. Az AI‑tartalom automatikus jelölése biztosított.
          </p>
          <p>
            A Szolgáltató nem vállal felelősséget a külső források tartalmáért; a külső oldalak
            tartalmáért azok üzemeltetői felelnek.
          </p>
          <p>
            A Szolgáltatáson megjelenő tartalom szerzői jogi védelem alatt állhat. A tartalom
            jogosulatlan tömeges másolása, terjesztése vagy kereskedelmi felhasználása tilos.
          </p>
          <p>
            Felhasználói által feltöltött tartalom esetén a feltöltő garantálja, hogy rendelkezik a
            szükséges jogokkal, és a Szolgáltató részére nem kizárólagos, visszavonható felhasználási
            jogot adhat a közzétételhez.
          </p>
        </section>

        <section>
          <h2>7. Moderáció és bejelentési eljárás</h2>
          <p>
            A Felhasználók bejelenthetik a jogsértő vagy problémás tartalmakat a <strong>support@utom.hu</strong>
            címen. A Szolgáltató a bejelentéseket ésszerű határidőn belül kivizsgálja, és szükség esetén
            intézkedik (tartalom eltávolítása, korlátozás).
          </p>
          <p>
            A bejelentés tartalmazza a jogsértés pontos leírását, a kérdéses tartalom linkjét és a
            bejelentő elérhetőségét.
          </p>
        </section>

        <section>
          <h2>8. Felelősségkorlátozás és kártérítés</h2>
          <p>
            A Szolgáltató mindent megtesz a szolgáltatás folyamatos és hibamentes működéséért, azonban
            nem vállal garanciát a szolgáltatás megszakítás‑, hibamentességére vagy a tartalom
            pontosságára. A Szolgáltató nem felel a közvetett károkért, üzleti veszteségekért vagy
            elmaradt haszonért.
          </p>
          <p>
            A Szolgáltató közvetlen kártérítési kötelezettsége a felhasználó részére legfeljebb az
            adott szolgáltatásért a megelőző 12 hónapban ténylegesen megfizetett díjak összegére
            korlátozódik (ha nincs díjfizetés, akkor a kártérítési kötelezettség minimális).
          </p>
          <p>
            A Felhasználó köteles megtéríteni a Szolgáltatónak minden olyan kárt és költséget, amely a
            Felhasználó jogsértő magatartásából ered, ideértve a jogi költségeket is.
          </p>
        </section>

        <section>
          <h2>9. Szavatosság és panaszkezelés</h2>
          <p>
            A Szolgáltató a jogszabályokban előírt szavatossági kötelezettségeket teljesíti. Hibák,
            hiányosságok vagy panasz esetén a Felhasználó a <strong>support@utom.hu</strong> címen
            tehet bejelentést. A Szolgáltató a bejelentést nyilvántartja és ésszerű határidőn belül
            válaszol.
          </p>
        </section>

        <section>
          <h2>10. Adatvédelem és sütik</h2>
          <p>
            A Szolgáltató az adatkezelést külön Adatvédelmi Tájékoztatóban szabályozza, amely a
            <a href="/adatvedelem"> /adatvedelem</a> oldalon érhető el. A Felhasználó a Szolgáltatás
            használatával elfogadja az Adatvédelmi Tájékoztatóban foglaltakat.
          </p>
          <p>
            A weboldal sütiket és analitikai eszközöket használ a szolgáltatás fejlesztése és a
            felhasználói élmény javítása érdekében. A sütik kezelésére vonatkozó részletes információk
            az Adatvédelmi Tájékoztatóban találhatók.
          </p>
        </section>

        <section>
          <h2>11. Harmadik felek és linkek</h2>
          <p>
            A Szolgáltatás külső forrásokra hivatkozhat. A Szolgáltató nem vállal felelősséget a
            külső oldalak tartalmáért, elérhetőségéért vagy azok által alkalmazott adatkezelési
            gyakorlatokért.
          </p>
        </section>

        <section>
          <h2>12. Vis maior és karbantartás</h2>
          <p>
            A Szolgáltató nem felel olyan eseményekért, amelyek elháríthatatlan külső okokból (vis
            maior) következnek be, ideértve a természeti katasztrófákat, háborút, terrorcselekményt,
            szolgáltatói hálózati kiesést vagy egyéb, a Szolgáltatón kívül álló okokat.
          </p>
          <p>
            Rendszeres karbantartásról a Szolgáltató előzetesen tájékoztatást adhat; sürgős javítások
            esetén előfordulhat rövid ideig tartó szolgáltatáskimaradás.
          </p>
        </section>

        <section>
          <h2>13. Jogviták és alkalmazandó jog</h2>
          <p>
            Jelen ÁSZF‑re a magyar jog az irányadó. A Szolgáltató és a Felhasználó közötti viták
            elsősorban békés úton, egyeztetéssel rendezendők. Amennyiben ez nem vezet eredményre,
            a jogviták eldöntésére a Szolgáltató székhelye szerinti illetékes magyar bíróság
            kizárólagos illetékességét kötik ki.
          </p>
        </section>

        <section>
          <h2>14. Módosítások és hatálybalépés</h2>
          <p>
            A Szolgáltató jogosult az ÁSZF‑et módosítani. A módosításokat a Szolgáltató a weboldalon
            teszi közzé; a módosítás közzétételét követően a változások hatályba lépnek, kivéve, ha a
            Szolgáltató másként rendelkezik.
          </p>
          <p>
            A Felhasználó a Szolgáltatás további használatával elfogadja a módosított ÁSZF‑et.
          </p>
        </section>

        <section>
          <h2>15. Kapcsolat</h2>
          <p>
            Kapcsolattartó: <strong>Lakatos Márk / Utom.hu</strong><br />
            E‑mail: <strong>support@utom.hu</strong>
          </p>
        </section>

        <section>
          <h2>16. Záró rendelkezések</h2>
          <p>
            Amennyiben a jelen ÁSZF bármely rendelkezése érvénytelennek vagy végrehajthatatlannak
            bizonyul, ez nem érinti a többi rendelkezés érvényességét. A felek a jogszabályoknak
            megfelelően törekednek a vitás kérdések békés rendezésére.
          </p>
        </section>

        <footer className="aszf-footer">
          <p>© {new Date().getFullYear()} Utom.hu</p>
        </footer>
      </div>
    </main>
  );
}
