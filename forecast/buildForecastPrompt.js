function buildForecastPrompt(category, points) {
  const history = points
    .map(p => `${p.date} → ${p.count}`)
    .join("\n");

  return `
KATEGÓRIA: ${category}

AZ ELMÚLT 7 NAP ÓRÁS ADATAI:
${history}

FELADAT:
- készíts előrejelzést a következő 12 órára
- minden órára adj egy egész számot
- ne írj szöveget, csak JSON-t
- formátum:
[
  { "date": "YYYY-MM-DD HH:00:00", "predicted": 12 },
  ...
]

MOST ADD MEG A JSON-T.
`;
}

module.exports = buildForecastPrompt;
