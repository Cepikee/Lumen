import React from "react";

export default function AdatVedelmiNyilatkozat() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", lineHeight: 1.6 }}>
      <h1>Adatvédelmi nyilatkozat</h1>

      <section>
        <h2>1. Üzemeltető azonosítása</h2>
        <p>
          A szolgáltatás üzemeltetője: <strong>Lakatos Márk</strong>, egyéni vállalkozó (KATA). Az üzemeltető jogi formája a
          jövőben <strong>Kft</strong>-re változhat; a változásról a feltételek frissítésével adunk tájékoztatást.
        </p>
        <p>
          Kapcsolat: <strong>info@domain.hu</strong> (végleges e-mail a domain beállítását követően kerül megadásra). Székhely/lakcím
          kizárólag a whitepaperben kerül feltüntetésre.
        </p>
      </section>

      <section>
        <h2>2. Kezelt adatok köre</h2>
        <ul>
          <li>
            <strong>Regisztrációs adatok:</strong> név és e-mail cím (a felhasználói fiók létrehozásához és kommunikációhoz).
          </li>
          <li>
            <strong>Használati adatok:</strong> mely tartalmakra kattint, megtekintési előzmények (személyre szabott ajánlásokhoz
            és funkciók javításához).
          </li>
          <li>
            <strong>Cookie-k:</strong> kizárólag a működéshez szükséges (session, bejelentkezés). Teljesítmény/analitikai vagy
            marketing cookie-t csak külön hozzájárulással használunk.
          </li>
          <li>
            <strong>Technikai naplók:</strong> a tárhelyszolgáltató szervernaplói átmenetileg tartalmazhatnak IP-címeket a biztonság
            és hibaelhárítás céljából; ezeket nem használjuk profilalkotáshoz.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Adatkezelés célja és jogalapja</h2>
        <ul>
          <li>
            <strong>Szolgáltatás működtetése:</strong> fiókkezelés, bejelentkezés, hírösszefoglalók megjelenítése.
            <em> Jogalap:</em> szerződés teljesítése (GDPR 6. cikk (1) b)).
          </li>
          <li>
            <strong>Személyre szabás és fejlesztés:</strong> releváns tartalmak ajánlása, funkciók javítása.
            <em> Jogalap:</em> jogos érdek (GDPR 6. cikk (1) f)), amelyről a felhasználó tiltakozhat.
          </li>
          <li>
            <strong>Kötelező biztonság:</strong> visszaélések megelőzése, rendszerintegritás.
            <em> Jogalap:</em> jogos érdek és jogi kötelezettség (GDPR 6. cikk (1) c) és f)).
          </li>
          <li>
            <strong>Nem kötelező analitika/cookie:</strong> csak külön hozzájárulással.
            <em> Jogalap:</em> hozzájárulás (GDPR 6. cikk (1) a)).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Adatmegőrzési idők</h2>
        <ul>
          <li>
            <strong>Felhasználói fiók adatai:</strong> a fiók törléséig, majd biztonsági mentésekben legfeljebb 30 napig.
          </li>
          <li>
            <strong>Használati adatok:</strong> legfeljebb 180 napig, aggregáltan és anonimizáltan tovább megőrizhetők statisztikai célra.
          </li>
          <li>
            <strong>Szervernaplók (IP):</strong> legfeljebb 30 napig hibaelhárítási és biztonsági célból.
          </li>
          <li>
            <strong>Szolgáltatás megszűnése:</strong> minden személyes adat 30 napon belül törlésre kerül.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Felhasználói jogok</h2>
        <ul>
          <li>
            <strong>Hozzáférés:</strong> kérhet tájékoztatást az általunk kezelt személyes adatairól.
          </li>
          <li>
            <strong>Helyesbítés és törlés:</strong> kérheti adatai javítását vagy törlését („elfeledtetés joga”).
          </li>
          <li>
            <strong>Korlátozás és tiltakozás:</strong> tiltakozhat jogos érdek alapján végzett kezelés ellen; kérheti a kezelés korlátozását.
          </li>
          <li>
            <strong>Adathordozhatóság:</strong> kérheti adatai kiadását strukturált, géppel olvasható formátumban.
          </li>
          <li>
            <strong>Panaszjog:</strong> jogosultság a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH) panaszt tenni.
          </li>
        </ul>
        <p>
          Jogai gyakorlásához írjon a <strong>privacy@domain.hu</strong> címre (végleges e-mail megadása a domain beállítását követően).
        </p>
      </section>

      <section>
        <h2>6. Adattovábbítás és harmadik felek</h2>
        <ul>
          <li>
            <strong>Tárhelyszolgáltató:</strong> a weboldal üzemeltetéséhez szükséges mértékben fér hozzá technikai adatokhoz.
          </li>
          <li>
            <strong>Analitika:</strong> alapértelmezetten nem használunk külső analitikát; bevezetés esetén csak hozzájárulással és külön tájékoztatással.
          </li>
          <li>
            <strong>Adatértékesítés:</strong> személyes adatokat nem értékesítünk, nem adunk át marketing célokra.
          </li>
          <li>
            <strong>Adatmozgatás:</strong> adatokat az EGT területén belül kezelünk; EGT-n kívüli továbbítás esetén megfelelő garanciákat biztosítunk.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Biztonsági intézkedések</h2>
        <ul>
          <li>
            <strong>Adatátvitel és tárolás:</strong> TLS titkosítás, erős jelszavak és hozzáférés-korlátozás.
          </li>
          <li>
            <strong>Hozzáférés-kezelés:</strong> naplózott admin-hozzáférés, szükséges és elégséges jogosultságok.
          </li>
          <li>
            <strong>Incidenskezelés:</strong> észlelés és értesítés ésszerű határidőn belül, adatvesztés esetén érintettek tájékoztatása.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Joghatóság és változások</h2>
        <p>
          Az adatkezelésre a <strong>magyar jog</strong> és az <strong>EU GDPR</strong> az irányadó. A jelen nyilatkozat időről időre
          frissülhet; lényeges változás esetén a weboldalon értesítést teszünk közzé, és e-mailes értesítést küldünk a
          regisztrált felhasználóknak.
        </p>
        <p>
          A jelen verzió az oldalon közzétett időponttól hatályos; korábbi verziók archívban elérhetők lesznek.
        </p>
      </section>
    </main>
  );
}
