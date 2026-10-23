"use strict";

const { assertCapability, getRuntimeConfig } = require("../config/runtime");
const { mockAiResponse, mockEmbedding } = require("./mockAi");
const { systemPromptForTask } = require("./prompt-security");
const { executeReservedAiCall } = require("./cost-guard");

async function generateAi({ task = "short_summary", prompt = "", maxTokens = 300, costContext } = {}) {
  const config = getRuntimeConfig();
  if (config.aiProvider === "mock") return mockAiResponse(task);

  assertCapability("realAi", config);
  if (!costContext?.reservation || !costContext?.pool) throw new Error("ai_cost_reservation_required");
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: costContext.reservation.timeoutMs, maxRetries: 0 });
  const response = await executeReservedAiCall({
    pool: costContext.pool,
    reservation: costContext.reservation,
    logger: costContext.logger,
    providerCall: () => openai.chat.completions.create({
      model: config.openAiModel,
      messages: [
        { role: "system", content: systemPromptForTask(task) },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  return {
    content: response.choices?.[0]?.message?.content?.trim() ?? "",
    isMock: false,
    marker: null,
    task,
  };
}

async function callOpenAI(prompt, maxTokens = 300, task = "short_summary", costContext) {
  return (await generateAi({ task, prompt, maxTokens, costContext })).content;
}

async function generateEmbedding(input, model = "text-embedding-3-small", costContext) {
  const config = getRuntimeConfig();
  if (config.aiProvider === "mock") return { embedding: mockEmbedding(), isMock: true, model: "mock-embedding" };
  assertCapability("realAi", config);
  if (!costContext?.reservation || !costContext?.pool) throw new Error("ai_cost_reservation_required");
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: costContext.reservation.timeoutMs, maxRetries: 0 });
  const response = await executeReservedAiCall({
    pool: costContext.pool,
    reservation: costContext.reservation,
    logger: costContext.logger,
    providerCall: () => openai.embeddings.create({ model, input }),
  });
  return { embedding: response.data[0].embedding, isMock: false, model };
}

module.exports = { callOpenAI, generateAi, generateEmbedding };
