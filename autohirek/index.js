require("dotenv").config();
const getTodayArticles = require("./getArticles");
const { buildDailyInput, buildPrompt } = require("./buildPrompt");
const generateReport = require("./generateReport");
const saveDailyReport = require("./saveReport");
const generateTTSFromText = require("./generateTTS");

async function runAutoHirekPipeline() {
  console.log("🔍 Mai hírek lekérése az adatbázisból...");

  const articles = await getTodayArticles();

  console.log(`📄 ${articles.length} hír találva a mai napra.`);

  const dailyInput = buildDailyInput(articles);
  const prompt = buildPrompt(dailyInput);

  console.log("🤖 Napi összefoglaló cikk generálása Ollamával...");

  const report = await generateReport(prompt);

  console.log("\n📝 Mentés adatbázisba...");

  await saveDailyReport(report);

  console.log("💾 Mentve a daily_reports táblába.");

  console.log("🎤 Narráció generálása a napi cikkből...");

  const ttsResult = await generateTTSFromText(report);

  console.log("✅ Narráció elkészült:");
  console.log(`   Fájlnév: ${ttsResult.fileName}`);
  console.log(`   Elérési út: ${ttsResult.path}`);

  console.log("\n✅ Napi összefoglaló cikk elkészült, elmentve, narráció legenerálva.\n");
}

runAutoHirekPipeline().catch((err) => {
  console.error("❌ Hiba a napi hírek pipeline futtatása közben:", err);
});
