require("dotenv").config();

const getTimeseries = require("./getTimeseries");
const buildForecastPrompt = require("./buildForecastPrompt");
const saveForecast = require("./saveForecast");

// JSON extractor
function extractJson(text) {
  if (!text) throw new Error("Empty AI response");

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1) {
    throw new Error("No JSON array found in AI output");
  }

  const jsonString = text.slice(start, end + 1);
  return JSON.parse(jsonString);
}

async function callOllama(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 perc

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
        keep_alive: 0,
        options: { num_predict: 400 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await res.json();
    return data.response;

  } catch (err) {
    clearTimeout(timeout);
    console.error("❌ OLLAMA HIBA / TIMEOUT:", err);
    return null; // soha ne álljon le
  }
}


async function runForecastPipeline() {
  console.log("🔍 Órás adatok lekérése...");
  const timeseries = await getTimeseries(24 * 7);

  // ⭐ MOST CET-ben
  const nowLocal = new Date();

  // ⭐ Következő egész óra CET-ben
  const startHour = new Date(nowLocal);
  startHour.setMinutes(0, 0, 0);
  startHour.setHours(startHour.getHours() + 1);

  // ⭐ ISO formátum CET-ben
  const startHourIso = startHour.toISOString().slice(0, 19).replace("T", " ");

  // ⭐ 6 órás jövőbeli horizont
  const futureHours = 6;

  for (const category of Object.keys(timeseries)) {
    console.log(`\n📊 Kategória: ${category}`);

    const points = timeseries[category];

    // ⭐ ÚJ PROMPT: CET idővel, 6 órára
    const prompt = buildForecastPrompt(category, points, futureHours, startHourIso);

    console.log("🤖 AI előrejelzés generálása...");
    const raw = await callOllama(prompt);

    let forecast;
    try {
      forecast = extractJson(raw);
    } catch (err) {
      console.error("❌ JSON extract/parse error:", err);
      continue;
    }

    console.log("💾 Mentés DB-be...");
    await saveForecast(category, forecast);

    console.log("✔ Kész!");
  }

  console.log("\n🎉 Minden kategória előrejelzése elkészült!");
}

runForecastPipeline().catch(console.error);
