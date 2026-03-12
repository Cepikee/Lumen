// forecast.js

require("dotenv").config();

const mysql = require("mysql2/promise");
const getTimeseries = require("./getTimeseries");
const buildForecastPrompt = require("./buildForecastPrompt");
const saveForecast = require("./saveForecast");

// DB kapcsolat helper
async function getConnection() {
  return mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "jelszo",
    database: "projekt2025",
  });
}

// 0) Jelzés: forecast éppen fut
async function markForecastRunning() {
  const conn = await getConnection();
  await conn.execute(`
    INSERT INTO forecast_runs (finished_at, status)
    VALUES (NULL, 'running')
  `);
  await conn.end();
  console.log("🏃‍♂️ Forecast státusz: RUNNING");
}

// 1) MINDEN régi forecast törlése (minden kategória)
async function deleteOldForecasts() {
  console.log("🗑 Régi előrejelzések törlése (forecast tábla teljes ürítése)...");
  const conn = await getConnection();
  await conn.execute("DELETE FROM forecast");
  await conn.end();
  console.log("🗑 Kész: forecast tábla kiürítve.");
}

// 4) Utolsó futás időpontjának mentése + státusz FINISHED
async function saveLastForecastTime(date) {
  console.log("🕒 Utolsó futás mentése DB-be:", date);

  const conn = await getConnection();

  await conn.execute(
    `
      UPDATE forecast_runs
      SET finished_at = ?, status = 'finished'
      ORDER BY id DESC
      LIMIT 1
    `,
    [date]
  );

  await conn.end();
  console.log("🕒 Kész: forecast_runs frissítve (FINISHED).");
}

// JSON extractor
function extractJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty AI response");
  }

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
  const timeout = setTimeout(() => {
    console.error("⏳ OLLAMA TIMEOUT – 10 perc eltelt, megszakítom.");
    controller.abort();
  }, 10 * 60 * 1000); // 10 perc

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
        keep_alive: 0,
        options: { num_predict: 400 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(
        "❌ OLLAMA HTTP HIBA:",
        res.status,
        await res.text().catch(() => "")
      );
      return null;
    }

    const data = await res.json().catch((err) => {
      console.error("❌ OLLAMA JSON PARSE HIBA:", err);
      return null;
    });

    if (!data || typeof data.response !== "string") {
      console.error("❌ OLLAMA ÜRES / HIBÁS VÁLASZ:", data);
      return null;
    }

    return data.response;
  } catch (err) {
    clearTimeout(timeout);
    console.error("❌ OLLAMA HIBA / TIMEOUT / ABORT:", err);
    return null;
  }
}

// Helyi időből MySQL DATETIME (YYYY-MM-DD HH:MM:SS) – NEM UTC!
function toMysqlLocalDatetime(date) {
  const pad = (n) => (n < 10 ? "0" + n : String(n));

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

async function runForecastPipeline() {
  try {
    console.log("🔍 Órás adatok lekérése...");
    const timeseries = await getTimeseries(48);

    const nowLocal = new Date();

    // következő egész óra (HELYI IDŐ szerint)
    const startHour = new Date(nowLocal);
    startHour.setMinutes(0, 0, 0); // percek, másodpercek, milliszekundumok lenullázása
    startHour.setHours(startHour.getHours() + 1); // következő óra

    // HELYI idő → MySQL DATETIME string (nem toISOString, nem UTC)
    const startHourIso = toMysqlLocalDatetime(startHour);

    const futureHours = 6;

    for (const category of Object.keys(timeseries)) {
      console.log(`\n📊 Kategória: ${category}`);

      const points = timeseries[category] || [];
      if (!Array.isArray(points) || points.length === 0) {
        console.error("❌ ÜRES TIMESERIES, KIHAGYVA:", category);
        continue;
      }

      const prompt = buildForecastPrompt(
        category,
        points,
        futureHours,
        startHourIso
      );

      console.log("🤖 AI előrejelzés generálása...");
      const raw = await callOllama(prompt);

      if (!raw) {
        console.error("❌ ÜRES / HIBÁS AI VÁLASZ, KIHAGYVA:", category);
        continue;
      }

      let forecast;
      try {
        forecast = extractJson(raw);
      } catch (err) {
        console.error("❌ JSON extract/parse error:", err);
        continue;
      }

      if (!Array.isArray(forecast) || forecast.length === 0) {
        console.error("❌ ÜRES / HIBÁS FORECAST ARRAY, KIHAGYVA:", category);
        continue;
      }

      console.log("💾 Mentés DB-be...");
      try {
        await saveForecast(category, forecast);
        console.log("✔ Kész!");
      } catch (err) {
        console.error("❌ MENTÉSI HIBA:", err);
      }
    }

    console.log("\n🎉 Minden kategória előrejelzése lefutott!");
  } catch (err) {
    console.error("❌ VÁRATLAN HIBA A PIPELINE-BAN:", err);
  }
}

// Következő futás kiszámítása – HELYES verzió
function calculateNextRun(finishedAt) {
  const nextRun = new Date(finishedAt);

  // +6 óra előrejelzés
  nextRun.setHours(nextRun.getHours() + 6);

  // -15 perc indulás előtt
  nextRun.setMinutes(nextRun.getMinutes() - 15);

  return nextRun;
}

// Végtelen ciklus – PM2 alatt fut
async function mainLoop() {
  while (true) {
    console.log("\n==============================");
    console.log("🚀 Forecast ciklus indul...");
    console.log("==============================");

    // 0. jelzés: forecast éppen fut
    await markForecastRunning();

    // 1. régi adatok törlése
    await deleteOldForecasts();

    // 2–3. forecast futtatása + mentés
    await runForecastPipeline();

    // 4. mentjük, mikor végeztünk
    const finishedAt = new Date();
    await saveLastForecastTime(finishedAt);

    // 5. következő futás kiszámítása
    const nextRun = calculateNextRun(finishedAt);
    console.log("⏭ Következő futás:", nextRun);

    const waitMs = nextRun - finishedAt;
    console.log("😴 Várakozás (ms):", waitMs);

    if (waitMs > 0) {
      await new Promise((res) => setTimeout(res, waitMs));
    } else {
      console.warn("⚠ Negatív várakozási idő, azonnali újrafutás.");
    }
  }
}

mainLoop();
