"use strict";

// M1.6 freezes the repository boundary only. It deliberately contains no SQL,
// pool, connection, migration, or feature-flag behavior.
const REPOSITORY_CONTRACT = Object.freeze({
  version: "v2.repository.1",
  boundary: "server-only",
  input: "normalized-record",
  output: "normalized-record",
  rawSql: "repository-implementation-only",
  transaction: Object.freeze({
    ownership: "caller",
    commit: "caller",
    rollback: "caller",
    release: "caller",
  }),
  scopes: Object.freeze([
    "entities",
    "aliases",
    "mentions",
    "relations",
    "evidence",
    "claims",
    "events",
    "aiRuns",
    "processingState",
    "ingestionProvenance",
    "conflicts",
    "confidenceHistory",
    "aiDecisions",
  ]),
  errors: Object.freeze(["validation", "not_found", "conflict", "database"]),
});

module.exports = { REPOSITORY_CONTRACT };
