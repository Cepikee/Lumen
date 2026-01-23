function buildDailyInput(articles) {
  if (!articles.length) {
    return "Ma nem érkezett hír.";
  }

  return articles
    .map((a, i) => {
      return `
Cikk ${i + 1}
ID: ${a.id}
Cím: ${a.title || "Nincs cím"}

Rövid összefoglaló:
${a.content || "Nincs rövid összefoglaló"}

Részletes összefoglaló:
${a.detailed_content || "Nincs részletes összefoglaló"}
`;
    })
    .join("\n-------------------------\n");
}

function buildPrompt(dailyInput) {
  return `
A MAI HÍREK NYERS ANYAGA:

${dailyInput}

-------------------------

FELADAT:
- írj egy összefüggő, 3–5 bekezdéses napi hírösszefoglalót
- a cikk legyen tömör, logikus, híradós hangvételű
- ne ismételd szó szerint a forrásokat
- emeld ki a lényeget, a trendeket, a fontos eseményeket
- ne írj clickbait stílusban
- ne írj felsorolást, csak folyamatos szöveget
- kizárólag a fenti hírekből dolgozz
- ne találj ki új információt

KÉSZÍTSD EL A NAPI HÍRÖSSZEFOGLALÓT MOST.
`;
}

module.exports = { buildDailyInput, buildPrompt };
