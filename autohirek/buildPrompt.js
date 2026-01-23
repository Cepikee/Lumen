function buildDailyInput(articles) {
  if (!articles.length) {
    return "Ma nem érkezett autós hír.";
  }

  return articles
    .map((a, i) => {
      return `
Cikk ${i + 1}
Cikk ID: ${a.article_id}

Rövid összefoglaló:
${a.content}

Hosszú összefoglaló:
${a.detailed_content}
`;
    })
    .join("\n-------------------------\n");
}

function buildPrompt(dailyInput) {
  return `
Te egy profi magyar hírszerkesztő vagy, aki a mai nap híreiből egyetlen, jól felépített cikket készít.

Feladatod:
- írj egy összefüggő, 3–6 bekezdéses hírcikket
- a cikk legyen tömör, érthető, logikus szerkezetű
- ne ismételd szó szerint a források szövegét
- emeld ki a legfontosabb eseményeket, trendeket, összefüggéseket
- a hangnem legyen tárgyilagos, híradós jellegű
- ne írj clickbait stílusban
- ne írj felsorolást, hanem folyamatos szöveget

Az alábbiakban találod a mai nap összes hírét (rövid és hosszú összefoglalóval):

${dailyInput}
`;
}


module.exports = { buildDailyInput, buildPrompt };
