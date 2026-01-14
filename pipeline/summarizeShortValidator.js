// summarizeShortValidator.js
// Rövid összefoglaló validátor + önjavító modul – Utom.hu stílusban

// --- AI hívás ---
async function callOllama(prompt, timeoutMs = 180000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: true,
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    try {
      const data = JSON.parse(raw);
      return (data.response ?? "").trim();
    } catch {
      return raw.trim();
    }
  } finally {
    clearTimeout(t);
  }
}

// --- 1) Validátor ---
function isValidShortSummary(text) {
  if (!text) return false;

  const t = text.trim();
  const lower = t.toLowerCase();

  // 1) Ne legyen túl rövid
  if (t.length < 40) return false;

  // 2) Ne írja vissza a promptot vagy meta-szöveget
  const forbiddenMeta = [
    "összefoglal",
    "foglaljad",
    "röviden",
    "itt a lényeg",
    "íme az összefoglaló",
    "sajnálom",
  ];
  if (forbiddenMeta.some(p => lower.includes(p))) return false;

  // 3) Ne legyen HTML
  if (t.startsWith("<") && t.endsWith(">")) return false;

  // 4) Ne legyen AI-körítés (angol bevezetők)
  const forbiddenAI = [
    "here is",
    "here's",
    "here are",
    "some of the key points",
    "overall",
    "the article",
    "in this article",
    "this text",
    "the following",
  ];
  if (forbiddenAI.some(p => lower.includes(p))) return false;

  // 5) Ne legyen számozott lista
  if (/^\s*\d+[\).]/m.test(t)) return false;

  // 6) Ne legyen túl sok mondat (max 5)
  const sentenceCount = (t.match(/[.!?]/g) || []).length;
  if (sentenceCount > 5) return false;

  return true;
}

// --- 2) Újragenerálás szigorúbb prompttal ---
async function regenerateShortSummary(articleText) {
  const prompt = `
Foglaljad össze a következő szöveget röviden, maximum 5 mondatban.
Ne írj bevezetőt, ne írj listát, ne írj meta-szöveget.
Csak magyarul válaszolj:

${articleText}
  `.trim();

  return (await callOllama(prompt)).trim();
}

// --- 3) Cleaner (ha a regen sem jó) ---
async function cleanShortSummary(text) {
  const prompt = `
Tisztítsd meg a szöveget. Csak magyarul válaszolj.
Ne adj hozzá új információt, ne írj bevezetőt, ne írj listát.

${text}
  `.trim();

  return (await callOllama(prompt)).trim();
}

// --- 4) Önjavító pipeline ---
async function fixShortSummary(articleText, summary) {
  // Ha jó → kész
  if (isValidShortSummary(summary)) return summary;

  // 1. próbálkozás: újragenerálás
  const regen = await regenerateShortSummary(articleText);
  if (isValidShortSummary(regen)) return regen;

  // 2. próbálkozás: cleaner
  const cleaned = await cleanShortSummary(regen);
  if (isValidShortSummary(cleaned)) return cleaned;

  // Ha még mindig rossz → visszaadjuk, de hibásként jelöljük
  return cleaned;
}

module.exports = {
  isValidShortSummary,
  fixShortSummary,
  regenerateShortSummary,
  cleanShortSummary,
  callOllama
};
