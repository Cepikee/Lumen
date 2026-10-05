"use strict";

function clone(value) { return JSON.parse(JSON.stringify(value)); }

// Test-only oracle: projects the gold observations through the same provider-shaped boundary.
// Production providers must never import this module or the gold manifest.
function buildOraclePredictions(dataset) {
  return {
    scenarios: dataset.scenarios.map((scenario) => ({
      id: scenario.id,
      entities: clone(scenario.expected.entities),
      relations: clone(scenario.expected.relations),
      claims: clone(scenario.expected.claims),
      events: clone(scenario.expected.events),
      conflicts: clone(scenario.expected.conflicts),
      changes: clone(scenario.expected.changesOverTime),
      omissions: clone(scenario.expected.omissions),
    })),
  };
}

module.exports = { buildOraclePredictions };
