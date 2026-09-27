"use strict";

const { assertCapability, getRuntimeConfig } = require("../config/runtime");
const { mockAiResponse, mockEmbedding } = require("./mockAi");

async function generateAi({ task = "short_summary", prompt = "", maxTokens = 300 } = {}) {
  const config = getRuntimeConfig();
  if (config.aiProvider === "mock") return mockAiResponse(task);

  assertCapability("realAi", config);
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: config.openAiModel,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
  });

  return {
    content: response.choices?.[0]?.message?.content?.trim() ?? "",
    isMock: false,
    marker: null,
    task,
  };
}

async function callOpenAI(prompt, maxTokens = 300, task = "short_summary") {
  return (await generateAi({ task, prompt, maxTokens })).content;
}

async function generateEmbedding(input, model = "text-embedding-3-small") {
  const config = getRuntimeConfig();
  if (config.aiProvider === "mock") return { embedding: mockEmbedding(), isMock: true, model: "mock-embedding" };
  assertCapability("realAi", config);
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({ model, input });
  return { embedding: response.data[0].embedding, isMock: false, model };
}

module.exports = { callOpenAI, generateAi, generateEmbedding };
