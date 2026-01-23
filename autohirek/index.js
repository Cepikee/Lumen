require("dotenv").config();

const axios = require("axios");
const getTodayArticles = require("./getArticles");
const { buildDailyInput, buildPrompt } = require("./buildPrompt");
const saveDailyReport = require("./saveReport");
// const generateTTSFromText = require("./generateTTS"); // most kikapcsolva

async function runAutoHirekPipeline() {
  console.log("🔍 Mai hírek lekérése az adatbázisból...");

  const articles = await getTodayArticles();
  console.log(`📄 ${articles.length} hír találva a mai napra.`);

  // 1) Cikkekből input
  const dailyInput = buildDailyInput(articles);

  // 2) Inputból prompt
  console.log("🧠 Prompt generálása...");
  const prompt = buildPrompt(dailyInput);

  // 3) Prompt → Ollama → NAPI CIKK
  console.log("🤖 Napi összefoglaló cikk generálása Ollamával...");

  const ollamaResponse = await axios.post("http://localhost:11434/api/generate", {
    model: "llama3.2",
    prompt: prompt,
  });

  const report = ollamaResponse.data.response; // EZ a napi cikk

  // 4) Mentés adatbázisba
  console.log("\n📝 Mentés adatbázisba...");
  await saveDailyReport(report);
  console.log("💾 Mentve a daily_reports táblába.");

  // 5) TTS most NINCS, hogy ne égjen pénz
  // console.log("🎤 Narráció generálása a napi cikkből...");
  // const ttsResult = await generateTTSFromText(report);
  // console.log("✅ Narráció elkészült:", ttsResult);

  console.log("\n🎉 KÉSZ! A napi szöveges összefoglaló elkészült, elmentve.\n");
}

runAutoHirekPipeline().catch((err) => {
  console.error("❌ Hiba a napi hírek pipeline futtatása közben:", err);
});
