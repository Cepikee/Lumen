require("dotenv").config();

const generateTTSFromText = require("./generateTTS");

(async () => {
  try {
    const result = await generateTTSFromText("Ez egy teszt narráció az Utom automatikus hírek rendszeréből.");
    console.log("TTS sikeres:", result);
  } catch (err) {
    console.error("TTS hiba:", err);
  }
})();
