"use strict";

const { assertCapability, getRuntimeConfig } = require("../config/runtime");
const { mockAiResponse } = require("./mockAi");

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

module.exports = { callOpenAI, generateAi };
