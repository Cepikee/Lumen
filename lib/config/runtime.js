"use strict";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

class OfflineOperationBlockedError extends Error {
  constructor(capability) {
    super(`A(z) ${capability} művelet a jelenlegi futási módban le van tiltva.`);
    this.name = "OfflineOperationBlockedError";
    this.code = "UTOM_OPERATION_BLOCKED";
    this.capability = capability;
  }
}

function enabled(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return TRUE_VALUES.has(String(value).trim().toLowerCase());
}

function getRuntimeConfig(env = process.env) {
  const offlineMode = enabled(env.UTOM_OFFLINE_MODE, true);
  const requestedProvider = String(env.AI_PROVIDER || "mock").toLowerCase();

  return Object.freeze({
    offlineMode,
    aiProvider: offlineMode ? "mock" : requestedProvider,
    openAiModel: env.OPENAI_MODEL || "gpt-4o-mini",
    capabilities: Object.freeze({
      realAi: !offlineMode && requestedProvider === "openai" && enabled(env.REAL_AI_ENABLED),
      feedFetch: !offlineMode && enabled(env.FEED_FETCH_ENABLED),
      emailSend: !offlineMode && enabled(env.EMAIL_SEND_ENABLED),
      databaseWrite: !offlineMode && enabled(env.DB_WRITE_ENABLED),
      videoGeneration: !offlineMode && enabled(env.VIDEO_GENERATION_ENABLED),
      payments: !offlineMode && enabled(env.PAYMENT_ENABLED),
      backgroundJobs: !offlineMode && enabled(env.BACKGROUND_JOBS_ENABLED),
    }),
  });
}

function assertCapability(capability, config = getRuntimeConfig()) {
  if (!config.capabilities[capability]) {
    throw new OfflineOperationBlockedError(capability);
  }
}

module.exports = { OfflineOperationBlockedError, assertCapability, getRuntimeConfig };
