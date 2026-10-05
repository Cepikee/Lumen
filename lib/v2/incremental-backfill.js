"use strict";

const { createHash, randomUUID } = require("node:crypto");
const { decideRoute } = require("./ai-cost-router");

const STEP_NAME = "v2.incremental_backfill";
const MAX_BATCH_SIZE = 100;
const MAX_CURSOR = Number.MAX_SAFE_INTEGER;

function invalid(errors) { return { status: "invalid", errors: [...new Set(errors)] }; }
function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function fingerprintArticle(article, version = "1") {
  if (!article || !Number.isSafeInteger(Number(article.id)) || Number(article.id) < 1) throw new TypeError("article_id_invalid");
  return sha256(JSON.stringify([STEP_NAME, version, Number(article.id), article.contentHash ?? null, article.updatedAt ?? null]));
}
function validateBackfillInput(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid(["input_required"]);
  const errors = [];
  const batchSize = input.batchSize == null ? 25 : Number(input.batchSize);
  const cursor = input.cursor == null || input.cursor === "" ? 0 : Number(input.cursor);
  const maxItems = input.maxItems == null ? batchSize : Number(input.maxItems);
  const costCeiling = input.costCeiling == null ? 0 : Number(input.costCeiling);
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH_SIZE) errors.push("batch_size_invalid");
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > MAX_CURSOR) errors.push("cursor_invalid");
  if (!Number.isSafeInteger(maxItems) || maxItems < 1) errors.push("max_items_invalid");
  if (!Number.isFinite(costCeiling) || costCeiling < 0) errors.push("cost_ceiling_invalid");
  if (input.featureEnabled != null && typeof input.featureEnabled !== "boolean") errors.push("feature_enabled_invalid");
  if (errors.length) return invalid(errors);
  return { status: "valid", result: Object.freeze({ batchSize, cursor, maxItems, costCeiling, featureEnabled: input.featureEnabled !== false, version: String(input.version || "1") }) };
}
function checksumRows(rows = []) {
  if (!Array.isArray(rows)) throw new TypeError("checksum_rows_invalid");
  const canonical = rows.map((row) => ({ id: Number(row.id), status: String(row.status), outputRef: row.outputRef == null ? null : String(row.outputRef) })).sort((a, b) => a.id - b.id);
  return sha256(JSON.stringify(canonical));
}
function decideBackfillRoute({ articleId, fingerprint, budget }) {
  const decision = decideRoute({ articleId, step: STEP_NAME, inputFingerprint: fingerprint, deterministicEligible: true, budget });
  if (decision.status !== "valid") throw new TypeError(decision.errors[0]);
  return decision.result;
}

async function runIncrementalBackfill({ repository, input = {}, processArticle = async () => ({ outputRef: null, cost: 0 }), budget }) {
  if (!repository || typeof repository.withTransaction !== "function") throw new TypeError("repository_required");
  const validation = validateBackfillInput(input);
  if (validation.status !== "valid") throw new TypeError(validation.errors[0]);
  const options = validation.result;
  if (!options.featureEnabled) return { status: "disabled", processed: 0, reused: 0, skipped: 0, nextCursor: options.cursor, checksum: checksumRows([]), cost: 0 };
  if (!budget) throw new TypeError("budget_context_required");
  return repository.withTransaction(async (tx) => {
    const articles = await tx.listArticlesAfter(options.cursor, Math.min(options.batchSize, options.maxItems));
    const rows = [];
    let processed = 0; let reused = 0; let skipped = 0; let unavailable = 0; let cost = 0; let nextCursor = options.cursor;
    for (const article of articles) {
      if (processed >= options.maxItems) break;
      const fp = fingerprintArticle(article, options.version);
      if (article.contentText === null && article.contentHash) {
        // A purged article is a valid historical record, but it cannot be
        // silently reprocessed from an empty body. Leave the step unclaimed
        // and return an explicit outcome so an operator can choose a policy-
        // approved refetch.
        unavailable += 1;
        rows.push({ id: Number(article.id), status: "raw_text_unavailable", outputRef: null });
        processed += 1; nextCursor = Number(article.id);
        continue;
      }
      const claim = await tx.claimStep({ articleId: Number(article.id), stepName: STEP_NAME, inputFingerprint: fp, claimToken: randomUUID() });
      if (claim.status === "completed") { reused += 1; rows.push({ id: Number(article.id), status: "completed", outputRef: claim.outputRef }); processed += 1; nextCursor = Number(article.id); continue; }
      if (claim.status === "busy") { skipped += 1; break; }
      const decision = decideBackfillRoute({ articleId: Number(article.id), fingerprint: fp, budget: { ...budget, nextCost: 0 } });
      if (typeof tx.persistDecision === "function") await tx.persistDecision({ articleId: Number(article.id), step: STEP_NAME, inputFingerprint: fp, deterministicEligible: true, budget });
      const result = await processArticle(article, { decision, inputFingerprint: fp });
      const itemCost = result?.cost == null ? 0 : Number(result.cost);
      if (!Number.isFinite(itemCost) || itemCost < 0 || cost + itemCost > options.costCeiling) throw new Error("cost_ceiling_exceeded");
      await tx.completeStep({ articleId: Number(article.id), stepName: STEP_NAME, inputFingerprint: fp, claimToken: claim.claimToken, outputRef: result?.outputRef ?? null });
      cost += itemCost; processed += 1; nextCursor = Number(article.id); rows.push({ id: Number(article.id), status: "completed", outputRef: result?.outputRef ?? null });
    }
    const pageSize = Math.min(options.batchSize, options.maxItems);
    const hasMore = skipped > 0 || (articles.length >= pageSize && processed > 0);
    return { status: hasMore ? "paused" : "completed", processed, reused, skipped, unavailable, nextCursor, checksum: checksumRows(rows), cost, hasMore };
  });
}

module.exports = { STEP_NAME, MAX_BATCH_SIZE, fingerprintArticle, validateBackfillInput, checksumRows, decideBackfillRoute, runIncrementalBackfill };
