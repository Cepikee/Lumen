import cron from "node-cron";

// 5 percenként fut
cron.schedule("*/5 * * * *", async () => {
  console.log("Automatikus összefoglalás indul...");

  // Meghívja a summarize-all API-t
  await fetch("http://localhost:3000/api/summarize-all");
});
