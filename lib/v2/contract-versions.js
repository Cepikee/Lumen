"use strict";

const CONTRACT_VERSIONS = Object.freeze({
  knowledgeSchema: "v2.1",
  vocabulary: "v2.vocabulary.1",
  extractionSchema: "v2.extraction.1",
  resolver: "v2.resolver.1",
  ingestionEnvelope: "v2.ingestion.1",
  dedupClusterAdapter: "v2.dedup-cluster.1",
  relatedNewsProjection: "v2.related-news.1",
  temporalGraph: "v2.temporal-graph.1",
  apiEnvelope: "v2.envelope.1",
});

module.exports = { CONTRACT_VERSIONS };
