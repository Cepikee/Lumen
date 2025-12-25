"use client";

import React from "react";

export default function AdatVedelmiNyilatkozat() {
  const lastUpdated = new Date().toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const Info = ({ text }: { text: string }) => (
    <span
      title={text}
      style={{
        cursor: "help",
        marginLeft: "6px",
        color: "var(--bs-primary)",
        fontWeight: "bold",
      }}
    >
      ⓘ
    </span>
  );

  return (
    <div className="container py-5" style={{ maxWidth: "1100px" }}>
      {/* CÍM + UTOLSÓ FRISSÍTÉS */}
      <div className="mb-5">
        <h1 className="fw-bold mb-2">Adatvédelmi nyilatkozat</h1>
        <p className="text-muted mb-1">
          Ez a tájékoztató bemutatja, hogyan kezeli az Utom.hu a felhasználók személyes adatait.
        </p>
        <p className="text-muted">Utolsó frissítés: {lastUpdated}</p>
      </div>

      <div className="row">
        {/* BAL OLDALI STICKY TARTALOMJEGYZÉK */}
        <aside className="col-md-3 d-none d-md-block">
          <div className="position-sticky" style={{ top: "100px" }}>
            <ul className="list-unstyled small">
              <li className="mb-2">
                <a href="#sec1" className="text-decoration-none text-secondary">
                  1. Üzemeltető
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec2" className="text-decoration-none text-secondary">
                  2. Kezelt adatok
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec3" className="text-decoration-none text-secondary">
                  3. Jogalapok
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec4" className="text-decoration-none text-secondary">
                  4. Megőrzés
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec5" className="text-decoration-none text-secondary">
                  5. Felhasználói jogok
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec6" className="text-decoration-none text-secondary">
                  6. Adattovábbítás
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec7" className="text-decoration-none text-secondary">
                  7. Biztonság
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec8" className="text-decoration-none text-secondary">
                  8. Fiókkezelés
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec9" className="text-decoration-none text-secondary">
                  9. Joghatóság
                </a>
              </li>
              <li className="mb-2">
                <a href="#sec10" className="text-decoration-none text-secondary">
                  10. GYIK
                </a>
              </li>
            </ul>
          </div>
        </aside>

        {/* JOBB OLDALI FŐ TARTALOM */}
        <div className="col-md-9">
          <div className="accordion" id="adatvedelemAccordion">
            {/* 1. Üzemeltető */}
            <div className="accordion-item mb-3" id="sec1">
              <h2 className="accordion-header">
                <button
                  className="accordion-button fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c1"
                >
                  👤 1. Üzemeltető adatai
                </button>
              </h2>
              <div
                id="c1"
                className="accordion-collapse collapse show"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az Utom.hu online szolgáltatás üzemeltetője:{" "}
                    <strong>Lakatos Márk</strong>, KATA-s egyéni vállalkozó. A
                    vállalkozás jogi formája a jövőben <strong>Kft</strong>-re
                    módosulhat; ilyen esetben a jelen tájékoztatót frissítjük, és a
                    változásról egyértelműen tájékoztatjuk a felhasználókat.
                  </p>
                  <p>
                    <strong>Elérhetőség:</strong> info@domain.hu (a végleges e‑mail cím a
                    domain konfigurálása után kerül véglegesen meghatározásra).
                  </p>
                  <p>
                    <strong>Tevékenység:</strong> online, előfizetéses jellegű SaaS
                    szolgáltatás nyújtása, amely valós idejű hírtrendek, kulcsszavak és
                    témák elemzését végzi több magyar forrás alapján, AI‑alapú
                    feldolgozással.
                  </p>
                  <p className="small text-muted mb-0">
                    Az üzemeltető felel a személyes adatok kezeléséért, a technikai
                    infrastruktúráért és a jogszabályoknak való megfelelésért.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Kezelt adatok köre */}
            <div className="accordion-item mb-3" id="sec2">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c2"
                >
                  📦 2. Kezelt adatok köre
                </button>
              </h2>
              <div
                id="c2"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az Utom.hu a szolgáltatás működtetéséhez minimálisan szükséges
                    személyes adatokat kezeli. Az adatok köre az alábbiak szerint
                    csoportosítható:
                  </p>

                  <h5 className="mt-3">2.1 Regisztrációs adatok</h5>
                  <ul>
                    <li>név</li>
                    <li>e‑mail cím</li>
                    <li>jelszó (erős, visszafejthetetlen hash formájában tárolva)</li>
                  </ul>
                  <p className="small text-muted">
                    Ezek az adatok a felhasználói fiók létrehozásához és azonosításához
                    szükségesek.
                  </p>

                  <h5 className="mt-3">2.2 Felhasználói fiók adatai</h5>
                  <ul>
                    <li>előfizetési csomag és annak érvényessége</li>
                    <li>fiókbeállítások, értesítési preferenciák</li>
                    <li>esetleges mentett kulcsszavak, kedvencek vagy testreszabott nézetek</li>
                  </ul>
                  <p className="small text-muted">
                    Ezek az adatok a személyre szabott felhasználói élményt és a
                    szolgáltatás testreszabását teszik lehetővé.
                  </p>

                  <h5 className="mt-3">2.3 Számlázási adatok</h5>
                  <ul>
                    <li>számlázási név</li>
                    <li>számlázási cím</li>
                    <li>adószám (ha releváns)</li>
                    <li>tranzakciós azonosítók, előfizetési adatok</li>
                  </ul>
                  <p>
                    <strong>Fontos:</strong> bankkártyaadatokat az Utom.hu{" "}
                    <strong>nem tárol</strong> és nem is lát. A fizetési tranzakciókat
                    kizárólag a választott fizetési szolgáltató (pl. Stripe, Barion)
                    kezeli.
                  </p>

                  <h5 className="mt-3">
                    2.4 Használati adatok
                    <Info text="Segítenek a funkciók fejlesztésében és a hibák azonosításában." />
                  </h5>
                  <ul>
                    <li>mely kulcsszavakra keres a felhasználó</li>
                    <li>milyen oldalakat, nézeteket, funkciókat használ</li>
                    <li>kattintási útvonalak, navigációs minták</li>
                  </ul>

                  <h5 className="mt-3">
                    2.5 Cookie‑k
                    <Info text="A sütik egy része a működéshez szükséges, más része opcionális." />
                  </h5>
                  <ul>
                    <li>működéshez szükséges sütik (session, bejelentkezés)</li>
                    <li>analitikai sütik (csak hozzájárulás esetén)</li>
                    <li>marketing sütik: alapértelmezetten nincsenek használatban</li>
                  </ul>

                  <h5 className="mt-3">
                    2.6 Technikai naplók
                    <Info text="Biztonsági és hibaelhárítási célú adatkezelés." />
                  </h5>
                  <ul>
                    <li>IP‑cím</li>
                    <li>böngésző típusa, operációs rendszer</li>
                    <li>időbélyegek, kérések metaadatai</li>
                    <li>szerveroldali hibák és figyelmeztetések</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. Adatkezelés célja és jogalapja */}
            <div className="accordion-item mb-3" id="sec3">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c3"
                >
                  ⚖️ 3. Adatkezelés célja és jogalapja
                </button>
              </h2>
              <div
                id="c3"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az Utom.hu az adatokat kizárólag meghatározott, jogszerű célból kezeli,
                    és csak addig, amíg az adott cél eléréséhez szükséges.
                  </p>

                  <h5>3.1 Szolgáltatás működtetése</h5>
                  <p>
                    Ide tartozik a fiókkezelés, bejelentkezés, előfizetés kezelése, valamint
                    az alapfunkciók biztosítása.{" "}
                    <span className="badge bg-primary">
                      Jogalap: szerződés teljesítése (GDPR 6. cikk (1) b))
                    </span>
                  </p>

                  <h5>3.2 Számlázás és jogi kötelezettségek</h5>
                  <p>
                    Számlák kiállítása, könyvelés, adózási kötelezettségek teljesítése.{" "}
                    <span className="badge bg-warning text-dark">
                      Jogalap: jogi kötelezettség (GDPR 6. cikk (1) c))
                    </span>
                  </p>

                  <h5>3.3 Személyre szabás és fejlesztés</h5>
                  <p>
                    A felhasználói viselkedésből származó adatok segítségével fejlesztjük a
                    funkciókat, javítjuk a felhasználói élményt, valamint relevánsabb
                    tartalmakat jelenítünk meg.{" "}
                    <span className="badge bg-info text-dark">
                      Jogalap: jogos érdek (GDPR 6. cikk (1) f))
                    </span>
                  </p>

                  <h5>3.4 Biztonság és visszaélések megelőzése</h5>
                  <p>
                    A technikai naplók és biztonsági események elemzése segít felismerni a
                    visszaéléseket, hibákat, támadásokat.{" "}
                    <span className="badge bg-info text-dark">
                      Jogalap: jogos érdek (GDPR 6. cikk (1) f))
                    </span>
                  </p>

                  <h5>3.5 Analitika és statisztika</h5>
                  <p>
                    Analitikai eszközöket használhatunk annak megértésére, hogyan használják
                    a szolgáltatást, milyen funkciók a legfontosabbak.{" "}
                    <span className="badge bg-success">
                      Jogalap: hozzájárulás (GDPR 6. cikk (1) a))
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Adatmegőrzési idők */}
            <div className="accordion-item mb-3" id="sec4">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c4"
                >
                  ⏳ 4. Adatmegőrzési idők
                </button>
              </h2>
              <div
                id="c4"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az adatokat csak addig őrizzük meg, amíg az adott cél eléréséhez, illetve
                    a jogszabályokban előírt ideig szükséges.
                  </p>

                  <ul>
                    <li>
                      <strong>Felhasználói fiók adatai:</strong> a fiók törléséig, majd
                      biztonsági mentésekben legfeljebb 30 napig.
                    </li>
                    <li>
                      <strong>Használati adatok:</strong> legfeljebb 180 napig, ezt követően
                      anonimizált formában statisztikai célból tovább is felhasználhatók.
                    </li>
                    <li>
                      <strong>Szervernaplók:</strong> legfeljebb 30 napig, kivéve, ha egy
                      biztonsági incidens vizsgálata ennél hosszabb megőrzést indokol.
                    </li>
                    <li>
                      <strong>Számlázási adatok:</strong> a hatályos számviteli törvény
                      alapján 8 évig megőrzendők.
                    </li>
                  </ul>
                  <p className="small text-muted mb-0">
                    A szolgáltatás végleges megszűnése esetén minden személyes adat
                    visszaállíthatatlanul törlésre kerül, kivéve a jogszabály által előírt
                    megőrzési idejű adatokat.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Felhasználói jogok */}
            <div className="accordion-item mb-3" id="sec5">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c5"
                >
                  🧾 5. Felhasználói jogok
                </button>
              </h2>
              <div
                id="c5"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    A felhasználóként a GDPR alapján több joggal is rendelkezik az adatai
                    kezelésével kapcsolatban.
                  </p>
                  <ul>
                    <li>
                      <strong>Hozzáférés joga:</strong> visszajelzést kérhet arról, hogy
                      kezeljük‑e a személyes adatait, és ha igen, milyen adatokról van szó.
                    </li>
                    <li>
                      <strong>Helyesbítés joga:</strong> kérheti a pontatlan adatok
                      helyesbítését, illetve a hiányos adatok kiegészítését.
                    </li>
                    <li>
                      <strong>Törlés joga („elfeledtetés”):</strong> bizonyos esetekben
                      kérheti személyes adatainak törlését, például ha az adatkezelés
                      alapja megszűnt, vagy jogellenes az adatkezelés.
                    </li>
                    <li>
                      <strong>Korlátozás joga:</strong> kérheti az adatkezelés korlátozását,
                      például vita esetén az adatok pontosságáról.
                    </li>
                    <li>
                      <strong>Adathordozhatóság joga:</strong> kérheti, hogy az általa
                      megadott adatokat strukturált, géppel olvasható formátumban megkapja,
                      vagy azokat másik szolgáltató részére továbbítsuk.
                    </li>
                    <li>
                      <strong>Tiltakozás joga:</strong> jogos érdeken alapuló adatkezelés
                      esetén tiltakozhat az adatkezelés ellen.
                    </li>
                    <li>
                      <strong>Panasz benyújtásának joga:</strong> ha úgy érzi, hogy az
                      adatkezelés sérti a jogait, panaszt tehet a Nemzeti Adatvédelmi és
                      Információszabadság Hatóságnál (NAIH).
                    </li>
                  </ul>
                  <p className="mb-0">
                    <strong>Kapcsolat az adatokkal kapcsolatos kérelmekhez:</strong>{" "}
                    privacy@domain.hu
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Adattovábbítás és harmadik felek */}
            <div className="accordion-item mb-3" id="sec6">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c6"
                >
                  🔄 6. Adattovábbítás és harmadik felek
                </button>
              </h2>
              <div
                id="c6"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az Utom.hu a személyes adatokat kizárólag olyan harmadik feleknek
                    továbbítja, akik a szolgáltatás nyújtásához technikailag szükségesek,
                    és megfelelő adatvédelmi garanciákat nyújtanak.
                  </p>
                  <ul>
                    <li>
                      <strong>Tárhelyszolgáltató:</strong> a weboldal és az adatbázis
                      üzemeltetéséhez szükséges technikai infrastruktúra biztosítása.
                    </li>
                    <li>
                      <strong>Fizetési szolgáltató:</strong> pl. Stripe vagy Barion; ők
                      kezelik a bankkártya‑ és fizetési adatokat, az Utom.hu csak a
                      tranzakciók állapotáról és az előfizetésről kap információt.
                    </li>
                    <li>
                      <strong>Analitikai szolgáltatók:</strong> csak hozzájárulás esetén
                      kapnak hozzáférést anonimizált vagy pszeudonimizált adatokhoz.
                    </li>
                    <li>
                      <strong>Adatértékesítés:</strong> az Utom.hu semmilyen formában nem
                      értékesít felhasználói adatokat harmadik fél részére.
                    </li>
                  </ul>
                  <p className="small text-muted mb-0">
                    Az Európai Gazdasági Térségen (EGT) kívülre irányuló adattovábbítás
                    esetén csak olyan partnerekkel dolgozunk, akik megfelelő garanciákat
                    nyújtanak (pl. adattovábbítási szerződések, titkosítás).
                  </p>
                </div>
              </div>
            </div>

            {/* 7. Biztonsági intézkedések */}
            <div className="accordion-item mb-3" id="sec7">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c7"
                >
                  🔐 7. Biztonsági intézkedések
                </button>
              </h2>
              <div
                id="c7"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az Utom.hu kiemelt fontosságúnak tartja a felhasználói adatok
                    biztonságát, ezért technikai és szervezési intézkedések kombinációját
                    alkalmazza.
                  </p>
                  <ul>
                    <li>HTTPS titkosítás minden adatforgalomra</li>
                    <li>jelszavak erős, egyirányú hash‑elése (pl. bcrypt)</li>
                    <li>hozzáférés‑korlátozás az admin és szerver oldalon</li>
                    <li>rendszeres biztonsági mentések és helyreállítási terv</li>
                    <li>adminisztrátori műveletek naplózása</li>
                    <li>
                      incidenskezelési eljárás: biztonsági esemény esetén az okok
                      kivizsgálása, szükség esetén értesítés az érintettek felé
                    </li>
                  </ul>
                  <p className="small text-muted mb-0">
                    Bár minden ésszerű intézkedést megteszünk, az internetes adatátvitel
                    soha nem lehet 100%-ban kockázatmentes. A kockázatokat azonban a
                    lehető legkisebb szintre igyekszünk csökkenteni.
                  </p>
                </div>
              </div>
            </div>

            {/* 8. Regisztráció és fiókkezelés */}
            <div className="accordion-item mb-3" id="sec8">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c8"
                >
                  🧑‍💻 8. Regisztráció és fiókkezelés
                </button>
              </h2>
              <div
                id="c8"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    A felhasználók önkéntesen hozhatnak létre fiókot az Utom.hu
                    rendszerében. A fiók létrehozásához regisztráció szükséges, amely során
                    a minimálisan szükséges adatokat kérjük be.
                  </p>
                  <ul>
                    <li>
                      A fiók bármikor törölhető: a felhasználó kérheti a fiókja
                      végleges törlését.
                    </li>
                    <li>
                      Fióktörlés esetén minden, a fiókhoz kapcsolódó adat törlésre kerül,
                      kivéve a számlázási adatokat, amelyeket jogi kötelezettség miatt
                      meg kell őriznünk.
                    </li>
                    <li>
                      Előfizetés lemondása esetén a fizetős funkciókhoz való hozzáférés
                      megszűnik, de a fiók – kérésre – továbbra is megmaradhat.
                    </li>
                    <li>
                      A felhasználó kérheti adatai exportját géppel olvasható formátumban.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 9. Joghatóság és módosítások */}
            <div className="accordion-item mb-3" id="sec9">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c9"
                >
                  🌍 9. Joghatóság és módosítások
                </button>
              </h2>
              <div
                id="c9"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <p>
                    Az Utom.hu adatkezelésére a magyar jog és az Európai Unió általános
                    adatvédelmi rendelete (GDPR) az irányadó.
                  </p>
                  <p>
                    Az adatvédelmi tájékoztató időről időre frissülhet, például új
                    funkciók bevezetése vagy jogszabályváltozás miatt. Lényeges
                    változás esetén a regisztrált felhasználókat e‑mailben vagy a
                    szolgáltatáson belüli értesítés formájában tájékoztatjuk.
                  </p>
                  <p className="small text-muted mb-0">
                    A korábbi verziók archiválása biztosítja, hogy nyomon követhető legyen,
                    mikor milyen feltételek voltak érvényben.
                  </p>
                </div>
              </div>
            </div>

            {/* 10. GYIK */}
            <div className="accordion-item mb-3" id="sec10">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed fw-bold"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#c10"
                >
                  ❓ 10. Gyakori kérdések (GYIK)
                </button>
              </h2>
              <div
                id="c10"
                className="accordion-collapse collapse"
                data-bs-parent="#adatvedelemAccordion"
              >
                <div className="accordion-body">
                  <h6>Miért kell IP‑címet tárolni?</h6>
                  <p>
                    Az IP‑cím naplózása segít a visszaélések, támadások felismerésében,
                    valamint a hibák diagnosztizálásában. Ezeket az adatokat nem használjuk
                    marketing célokra.
                  </p>

                  <h6>Miért kell 8 évig megőrizni a számlázási adatokat?</h6>
                  <p>
                    Ezt a kötelezettséget a magyar számviteli jogszabályok írják elő.
                    Az Utom.hu köteles a kiállított számlákhoz kapcsolódó adatokat az előírt
                    ideig megőrizni.
                  </p>

                  <h6>Tároltok bankkártyaadatokat?</h6>
                  <p>
                    Nem. A bankkártyaadatokat kizárólag a fizetési szolgáltató (pl. Stripe,
                    Barion) kezeli. Az Utom.hu csak a tranzakciók sikerességéről és
                    előfizetési állapotról kap információt.
                  </p>

                  <h6>Miért jelenik meg cookie‑banner?</h6>
                  <p>
                    Az EU ePrivacy irányelv és a GDPR előírja, hogy a nem feltétlenül
                    szükséges cookie‑k (pl. analitikai, marketing) használatához a
                    felhasználó hozzájárulása szükséges. A banner ezt a hozzájárulást
                    kezeli átlátható módon.
                  </p>

                  <h6>Hogyan törölhetem a fiókom?</h6>
                  <p>
                    A fiók törlését e‑mailben kérheti a privacy@domain.hu címen, vagy
                    a jövőben elérhetővé váló fiókbeállítások menüpontban. Törlés esetén
                    minden adat törlésre kerül, kivéve a jogszabály által megőrzendő
                    számlázási adatokat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
}
