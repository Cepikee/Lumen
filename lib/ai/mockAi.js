"use strict";

const MARKER = "[UTOM MOCK TESZTADAT]";

function mockAiResponse(task = "short_summary") {
  const responses = {
    short_summary: `${MARKER} A fixture cikk tartalmát röviden és tényszerűen bemutató, külső szolgáltatás nélkül készült tesztszöveg.`,
    long_summary: `${MARKER} Ez egy hosszabb, determinisztikus összefoglaló. Fejlesztési és tesztelési célra készült, nem valódi hírtartalom.`,
    category: "Tech",
    keywords: "offline, mock, tesztadat",
    title: "Offline tesztcikk címe",
    sentiment: "semleges",
    clickbait: "TITLE: 10\nCONTENT: 5\nCONSISTENCY: 8",
    malformed: "{nem érvényes JSON",
  };

  return Object.freeze({
    content: responses[task] ?? responses.short_summary,
    isMock: true,
    marker: "UTOM_MOCK_TEST_DATA",
    task,
  });
}

function mockEmbedding() {
  return Object.freeze(Array.from({ length: 32 }, (_, index) => Number(((index + 1) / 100).toFixed(2))));
}

module.exports = { MARKER, mockAiResponse, mockEmbedding };
