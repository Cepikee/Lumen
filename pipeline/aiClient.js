// aiClient.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function callOpenAI(prompt, maxTokens = 300) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
  });

  return res.choices?.[0]?.message?.content?.trim() ?? "";
}

module.exports = { callOpenAI };
