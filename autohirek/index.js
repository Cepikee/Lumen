require("dotenv").config();

const getTodayArticles = require("./getArticles");
const { buildDailyInput, buildPrompt } = require("./buildPrompt");
const saveDailyReport = require("./saveReport");

// 🔥 INLINE OLLAMA WRAPPER — stabil, timeouttal, limitált kimenettel
async function callOllama(prompt, numPredict = 600, timeoutMs = 18000000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
        keep_alive: 0,
        options: {
          num_predict: numPredict
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Ollama HTTP error: ${res.status}`);
    }

    const data = await res.json();
    return data.response; // EZ a napi cikk
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function runAutoHirekPipeline() {
  console.log("🔍 Mai hírek lekérése az adatbázisból...");

  const articles = await getTodayArticles();
  console.log(`📄 ${articles.length} hír találva a mai napra.`);

  // 1) Cikkekből input (csak rövid összefoglaló!)
  const dailyInput = buildDailyInput(articles);
  console.log("DailyInput mérete:", dailyInput.length);

  // 2) Inputból prompt
  console.log("🧠 Prompt generálása...");
  const prompt = buildPrompt(dailyInput);

  // 3) Prompt → Ollama → NAPI CIKK
  console.log("🤖 Napi összefoglaló cikk generálása Ollamával...");
  const report = await callOllama(prompt, 600);

  // 4) Mentés adatbázisba
  console.log("\n📝 Mentés adatbázisba...");
  await saveDailyReport(report);
  console.log("💾 Mentve a daily_reports táblába.");

  // 5) TTS kikapcsolva, hogy ne égjen pénz
  // console.log("🎤 Narráció generálása a napi cikkből...");
  // const ttsResult = await generateTTSFromText(report);

  console.log("\n🎉 KÉSZ! A napi szöveges összefoglaló elkészült, elmentve.\n");
}

if (require.main === module) {
  const { assertCapability } = require("../lib/config/runtime");
  assertCapability("backgroundJobs");
  runAutoHirekPipeline().catch((err) => {
    console.error("❌ Hiba a napi hírek pipeline futtatása közben:", err);
  });
}

module.exports = { runAutoHirekPipeline };
