require("dotenv").config();

const getTodayArticles = require("./getArticles");
const { buildDailyInput, buildPrompt } = require("./buildPrompt");
const saveDailyReport = require("./saveReport");
const generateTTSFromText = require("./generateTTS");

async function runAutoHirekPipeline() {
  console.log("🔍 Mai hírek lekérése az adatbázisból...");

  const articles = await getTodayArticles();
  console.log(`📄 ${articles.length} hír találva a mai napra.`);

  // 1) Összeállítjuk a napi inputot
  const dailyInput = buildDailyInput(articles);

  // 2) Prompt generálása Ollamának
  console.log("🧠 Prompt generálása...");
  const prompt = buildPrompt(dailyInput);

  // 3) Ollama → napi cikk
  console.log("🤖 Napi összefoglaló cikk generálása Ollamával...");
  const report = await prompt; // buildPrompt már Promise-t ad vissza

  // 4) Mentés adatbázisba
  console.log("\n📝 Mentés adatbázisba...");
  await saveDailyReport(report);
  console.log("💾 Mentve a daily_reports táblába.");

  // 5) TTS generálás
  console.log("🎤 Narráció generálása a napi cikkből...");
  const ttsResult = await generateTTSFromText(report);

  console.log("✅ Narráció elkészült:");
  console.log(`   Fájlnév: ${ttsResult.fileName}`);
  console.log(`   Elérési út: ${ttsResult.path}`);

  console.log("\n🎉 KÉSZ! A napi pipeline sikeresen lefutott.\n");
}

runAutoHirekPipeline().catch((err) => {
  console.error("❌ Hiba a napi hírek pipeline futtatása közben:", err);
});
