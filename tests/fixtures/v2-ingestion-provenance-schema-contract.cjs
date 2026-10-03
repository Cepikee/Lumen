"use strict";

const table = {
  name: "v2_ingestion_provenance",
  engine: "InnoDB",
  charset: "utf8mb4",
  columns: {
    id: { type: "bigint unsigned", nullable: false, autoIncrement: true },
    article_id: { type: "bigint unsigned", nullable: true },
    url_identity: { type: "char(64)", nullable: true },
    canonical_url: { type: "varchar(2048)", nullable: true },
    source_id: { type: "bigint unsigned", nullable: true },
    source_key: { type: "varchar(128)", nullable: true },
    publication_at: { type: "datetime(6)", nullable: true },
    publication_time_source: { type: "varchar(64)", nullable: true },
    observed_at: { type: "datetime(6)", nullable: true },
    request_id: { type: "char(36)", nullable: true },
    run_id: { type: "char(36)", nullable: true },
    operation_key: { type: "char(64)", nullable: false },
    normalization_version: { type: "varchar(64)", nullable: false },
    status: { type: "varchar(24)", nullable: false },
    created_at: { type: "datetime(6)", nullable: false },
  },
  primaryKey: ["id"],
  unique: [{ name: "uq_v2_ingestion_provenance_operation_key", columns: ["operation_key"] }],
  indexes: [
    { name: "idx_v2_ingestion_provenance_article_id", columns: ["article_id"] },
    { name: "idx_v2_ingestion_provenance_url_identity", columns: ["url_identity"] },
    { name: "idx_v2_ingestion_provenance_run_id", columns: ["run_id"] },
  ],
  foreignKeys: [
    { columns: ["article_id"], table: "articles", referencedColumns: ["id"], onDelete: "SET NULL", onUpdate: "RESTRICT" },
    { columns: ["source_id"], table: "sources", referencedColumns: ["id"], onDelete: "SET NULL", onUpdate: "RESTRICT" },
  ],
};

module.exports = { contractVersion: "v2.ingestion.1", table };
