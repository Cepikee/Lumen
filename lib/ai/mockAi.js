"use strict";

const MARKER = "[UTOM MOCK TESZTADAT]";

function mockAiResponse(task = "short_summary") {
  const responses = {
    short_summary: `${MARKER} Rövid, offline összefoglaló külső szolgáltatás hívása nélkül.`,
    long_summary: `${MARKER} Ez egy hosszabb, determinisztikus összefoglaló. Fejlesztési és tesztelési célra készült, nem valódi hírtartalom.`,
    category: "Tech",
    keywords: "offline, mock, tesztadat",
    clickbait: "Tesztcím\nTeszt alcím",
    malformed: "{nem érvényes JSON",
  };

  return Object.freeze({
    content: responses[task] ?? responses.short_summary,
    isMock: true,
    marker: "UTOM_MOCK_TEST_DATA",
    task,
  });
}

module.exports = { MARKER, mockAiResponse };
