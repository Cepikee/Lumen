require("dotenv").config();

const getTimeseries = require("./getTimeseries");
const buildForecastPrompt = require("./buildForecastPrompt");
const saveForecast = require("./saveForecast");

// Ollama wrapper
async function callOllama(prompt) {
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
  });

  const data = await res.json();
  return data.response;
}

async function runForecastPipeline() {
  console.log("🔍 Órás adatok lekérése...");
  const timeseries = await getTimeseries(24 * 7);

  for (const category of Object.keys(timeseries)) {
    console.log(`\n📊 Kategória: ${category}`);

    const points = timeseries[category];
    const prompt = buildForecastPrompt(category, points);

    console.log("🤖 AI előrejelzés generálása...");
    const raw = await callOllama(prompt);

    let forecast;
    try {
      forecast = JSON.parse(raw);
    } catch {
      console.error("❌ JSON parse error");
      continue;
    }

    console.log("💾 Mentés DB-be...");
    await saveForecast(category, forecast);

    console.log("✔ Kész!");
  }

  console.log("\n🎉 Minden kategória előrejelzése elkészült!");
}

runForecastPipeline().catch(console.error);
