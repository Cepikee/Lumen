"use strict";

const { createHash } = require("node:crypto");

function externalOperationKey({ articleId, stepName, inputVersion, model, configVersion = "v1" }) {
  const identity = JSON.stringify({
    articleId: Number(articleId),
    stepName: String(stepName),
    inputVersion: String(inputVersion),
    model: String(model),
    configVersion: String(configVersion),
  });
  return createHash("sha256").update(identity).digest("hex");
}

function shortClaimToken(token) {
  return typeof token === "string" ? token.slice(0, 8) : "unknown";
}

module.exports = { externalOperationKey, shortClaimToken };
