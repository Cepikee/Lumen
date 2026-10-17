"use strict";

const { imagePolicy } = require("./policy");
const { PROMPT_VERSION, buildImagePrompt, imageFingerprint } = require("./prompt");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeMessage = (error) => String(error instanceof Error ? error.message : error).slice(0, 1000);

function createImageService({ repository, provider, storage, circuitBreaker, config, logger = () => {}, sleep = wait }) {
  async function fallback(claim, reason, options = {}) {
    await repository.complete(claim, {
      imageStatus: options.failed ? "failed" : "fallback",
      generationStatus: options.failed ? "failed" : "skipped",
      sourceType: "fallback",
      fallbackType: reason,
      retryCount: options.retryCount || 0,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
    });
    logger({ event: "article_image_fallback", articleId: claim.articleId, reason });
    return { status: options.failed ? "failed" : "fallback", reason };
  }

  async function process(claim, options = {}) {
    const article = await repository.load(claim);
    const policy = imagePolicy(article, { enabled: config.enabled, force: options.force });
    const prompt = buildImagePrompt(article);
    const fingerprint = imageFingerprint({
      articleId: article.id, prompt, provider: config.provider, model: config.model,
      width: config.width, height: config.height, forceRevision: article.force_revision,
    });
    await repository.savePrompt(claim, {
      policyAction: policy.action, promptVersion: PROMPT_VERSION, prompt, fingerprint,
      provider: config.provider, model: config.model,
    });

    if (policy.action === "skip") return fallback(claim, policy.reason);
    if (policy.action === "fallback_only") return fallback(claim, policy.reason);
    const recovered = await storage.findExisting({ articleId: article.id, fingerprint, date: article.image_created_at });
    if (recovered) {
      await repository.complete(claim, {
        imageStatus: "ready", generationStatus: "done", sourceType: "generated", ...recovered,
        retryCount: article.retry_count || 0,
      });
      logger({ event: "article_image_recovered", articleId: claim.articleId });
      return { status: "ready", reused: true, recovered: true, ...recovered };
    }
    const clusterImage = await repository.findClusterReady(article, {
      provider: config.provider, model: config.model, promptVersion: PROMPT_VERSION,
    });
    const reusable = clusterImage?.storage_path ? await storage.inspect(clusterImage.storage_path) : null;
    if (reusable) {
      await repository.complete(claim, {
        imageStatus: "ready", generationStatus: "done", sourceType: "cluster_reuse",
        reusedFromArticleId: clusterImage.article_id, ...reusable, retryCount: 0,
      });
      logger({ event: "article_image_reused", articleId: claim.articleId, source: "cluster" });
      return { status: "ready", reused: true, storagePath: clusterImage.storage_path };
    }
    if (!circuitBreaker.canRequest()) return fallback(claim, "provider_circuit_open");

    let lastError;
    let attemptsMade = 0;
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      await repository.heartbeat(claim);
      const budgetAvailable = await repository.reserveBudget({ provider: config.provider, dailyBudget: config.dailyBudget, amount: config.estimatedNeurons });
      if (!budgetAvailable) return fallback(claim, "daily_budget_exhausted", { retryCount: attempt });
      let generated;
      try {
        attemptsMade = attempt + 1;
        generated = await provider.generate(prompt);
        circuitBreaker.success();
      } catch (error) {
        lastError = error;
        circuitBreaker.failure();
        logger({ event: "article_image_attempt_failed", articleId: claim.articleId, attempt: attempt + 1, code: error?.code || "generation_failed" });
        if (!error?.retryable || attempt >= config.maxRetries || !circuitBreaker.canRequest()) break;
        await sleep(Math.max(error.retryAfterMs || 0, Math.min(5_000, 250 * (2 ** attempt))));
        continue;
      }
      await repository.heartbeat(claim);
      let saved;
      try {
        saved = await storage.save({ articleId: article.id, fingerprint, bytes: generated.bytes, date: article.image_created_at, declaredMimeType: generated.mimeType });
      } catch (error) {
        return fallback(claim, "storage_failed", {
          failed: true, retryCount: attemptsMade, errorCode: "storage_failed", errorMessage: safeMessage(error),
        });
      }
      try {
        await repository.complete(claim, {
          imageStatus: "ready", generationStatus: "done", sourceType: "generated", ...saved, retryCount: attempt,
        });
      } catch (error) {
        logger({ event: "article_image_terminal_update_failed", articleId: claim.articleId, code: error?.code || "db_update_failed" });
        throw error;
      }
      logger({ event: "article_image_ready", articleId: claim.articleId, attempt: attempt + 1, byteSize: saved.byteSize });
      return { status: "ready", reused: false, ...saved };
    }
    return fallback(claim, "generation_failed", {
      failed: true, retryCount: attemptsMade,
      errorCode: lastError?.code || "generation_failed", errorMessage: safeMessage(lastError),
    });
  }

  return { process };
}

module.exports = { createImageService };
