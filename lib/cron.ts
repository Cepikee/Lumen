// lib/cron.ts
import cron from "node-cron";
import { assertCapability } from "./config/runtime";

export function startLegacyCron() {
  assertCapability("backgroundJobs");
  return cron.schedule("*/5 * * * *", async () => {
  console.log("🚀 Automatikus frissítés indul:", new Date().toLocaleString("hu-HU"));
  try {
    const feedRes = await fetch("http://localhost:3000/api/fetch-feed");
    const feedData = await feedRes.json();
    console.log("📰 Feed feldolgozás eredmény:", feedData);

    const sumRes = await fetch("http://localhost:3000/api/summarize-all");
    const sumData = await sumRes.json();
    console.log("📊 Összefoglalás eredmény:", sumData);

    console.log("✅ Frissítés teljesítve!");
  } catch (err) {
    console.error("❌ Hiba a cron futtatás közben:", err);
  }
  });
}
