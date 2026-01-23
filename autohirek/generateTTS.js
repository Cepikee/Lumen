const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

async function generateTTSFromText(text) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Hiányzik az OPENAI_API_KEY környezeti változó.");
  }

  // fájlnév: pl. 2026-01-23-daily-report.mp3
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const fileName = `${yyyy}-${mm}-${dd}-daily-report.mp3`;

  const outputDir = path.join(__dirname, "..", "public", "tts");
  const outputPath = path.join(outputDir, fileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("🎤 TTS generálása OpenAI-val...");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts", // vagy később cserélheted másikra
      voice: "alloy",           // alap hang
      input: text,
      format: "mp3",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI TTS hiba:", errText);
    throw new Error(`OpenAI TTS hiba: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(outputPath, buffer);

  console.log(`💾 TTS fájl elmentve ide: ${outputPath}`);

  return {
    fileName,
    path: outputPath,
  };
}

module.exports = generateTTSFromText;
