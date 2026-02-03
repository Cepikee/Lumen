function buildForecastPrompt(category, points, futureHours, startHourIso) {
  const history = points
    .map(p => `${p.date} → ${p.count}`)
    .join("\n");

  return `
KATEGÓRIA: ${category}

AZ ELMÚLT 7 NAP ÓRÁS ADATAI:
${history}

FELADAT:
- készíts előrejelzést a következő ${futureHours} órára
- az első előrejelzett időpont: ${startHourIso}
- minden dátum KÖZÉP-EURÓPAI IDŐ (CET)
- ne módosítsd az időzónát
- minden órára adj egy egész számot
- ne írj szöveget, csak JSON-t
- formátum:
[
  { "date": "YYYY-MM-DD HH:00:00", "predicted": 12 }
]

MOST ADD MEG A JSON-T.
`;
}

module.exports = buildForecastPrompt;
