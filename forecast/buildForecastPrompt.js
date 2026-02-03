function buildForecastPrompt(category, points, futureHours, startHourIso) {
  const history = points
    .map(p => `${p.date} → ${p.count}`)
    .join("\n");

  return `
KATEGÓRIA: ${category}

AZ ELMÚLT 7 NAP ÓRÁS ADATAI (CET):
${history}

FELADAT:
A fenti idősor alapján készíts előrejelzést a következő ${futureHours} órára.
Az első előrejelzett időpont: ${startHourIso} (CET).

SZABÁLYOK, AMIKET KÖTELEZŐ BETARTANI:

1) IDŐZÓNA
- minden dátum KÖZÉP-EURÓPAI IDŐ (CET)
- ne módosítsd az időzónát
- pontosan a megadott időponttól indulj

2) MINTÁZATKÖVETÉS
- az előrejelzésnek követnie kell az elmúlt 7 nap órás mintázatát
- ha egy adott órában az elmúlt 7 napból legalább 6 napon 0 volt a cikkek száma,
  akkor az előrejelzésben is 0-t adj meg arra az órára
- ha egy adott órában az elmúlt 7 nap átlaga 0.5 alatt van, akkor kerekíts 0-ra
- ne találj ki aktivitást olyan órákra, ahol a múltban tartósan nem volt aktivitás

3) REALIZMUS
- ne adj meg irreálisan magas értékeket
- ha az elmúlt napokban a kategória átlagos órás értéke 0–3 között volt,
  akkor az előrejelzésben is maradj 0–3 között
- ha a kategória ritkán aktív, ne jósolj hirtelen kiugrást

4) TRENDEK
- ha az elmúlt napokban csökkenő trend látszik, ne jósolj növekedést
- ha stagnálás látszik, maradj stagnálásnál
- ha enyhe növekedés látszik, csak enyhe növekedést jósolj

5) KIMENET
- csak JSON-t adj vissza
- formátum:
[
  { "date": "YYYY-MM-DD HH:00:00", "predicted": szám }
]
- pontosan ${futureHours} elem legyen
- ne írj magyarázatot, kommentet vagy szöveget
`;
}

module.exports = buildForecastPrompt;
