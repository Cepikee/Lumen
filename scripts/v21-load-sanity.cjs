"use strict";

const { monitorEventLoopDelay, performance } = require("node:perf_hooks");

const baseUrl = (process.env.LOAD_BASE_URL || "http://127.0.0.1:3011").replace(/\/$/, "");
const steps = (process.env.LOAD_STEPS || "10,25,50,100,250,500")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);
const requestsPerStep = Math.max(steps.length ? Math.max(...steps) : 10, Number(process.env.LOAD_REQUESTS_PER_STEP || 200));
const stopErrorRate = Number(process.env.LOAD_STOP_ERROR_RATE || 0.05);
const routes = [
  { path: "/", expected: 200 },
  { path: "/trends", expected: 200 },
  { path: "/insights", expected: 200 },
  { path: "/insights/category/politika", expected: 200 },
  { path: "/premium", expected: 200 },
  { path: "/cikk/1", expected: 200 },
  { path: "/api/health", expected: 200 },
];
const expectedStatus = new Map(routes.map((route) => [route.path, route.expected]));

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function request(path) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    await response.arrayBuffer();
    const latencyMs = performance.now() - started;
    return { path, status: response.status, expected: expectedStatus.get(path), latencyMs, ok: response.status === expectedStatus.get(path) };
  } catch (error) {
    return { path, status: 0, expected: expectedStatus.get(path), latencyMs: performance.now() - started, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function runStep(concurrency) {
  const total = Math.max(concurrency, requestsPerStep);
  const queue = Array.from({ length: total }, (_, index) => routes[index % routes.length].path);
  const results = [];
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;
      results.push(await request(queue[index]));
    }
  }
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  eventLoop.enable();
  const cpuBefore = process.cpuUsage();
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsedMs = performance.now() - started;
  const cpu = process.cpuUsage(cpuBefore);
  eventLoop.disable();
  const errors = results.filter((result) => !result.ok);
  const latencies = results.map((result) => result.latencyMs);
  const byStatus = {};
  for (const result of results) byStatus[result.status] = (byStatus[result.status] || 0) + 1;
  return {
    concurrency,
    requests: results.length,
    elapsedMs: Math.round(elapsedMs),
    rps: Number((results.length / (elapsedMs / 1000)).toFixed(2)),
    p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
    p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
    p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
    errorRate: Number((errors.length / results.length).toFixed(4)),
    statuses: byStatus,
    rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
    heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
    cpuMs: Math.round((cpu.user + cpu.system) / 1000),
    eventLoopP99Ms: Number((eventLoop.percentile(99) / 1e6).toFixed(2)),
    errors: errors.slice(0, 5).map(({ path, status, error }) => ({ path, status, error })),
  };
}

async function main() {
  const health = await request("/api/health");
  if (!health.ok) {
    throw new Error(`load target is not healthy: ${health.status}${health.error ? ` (${health.error})` : ""}`);
  }
  console.log(JSON.stringify({ type: "config", baseUrl, routes, steps, requestsPerStep, stopErrorRate }));
  for (const concurrency of steps) {
    const result = await runStep(concurrency);
    console.log(JSON.stringify({ type: "step", ...result }));
    if (result.errorRate > stopErrorRate) {
      console.log(JSON.stringify({ type: "stop", reason: "error-rate-threshold", concurrency, errorRate: result.errorRate }));
      process.exitCode = 2;
      return;
    }
  }
  console.log(JSON.stringify({ type: "complete", status: "PASS" }));
}

main().catch((error) => {
  console.error(JSON.stringify({ type: "fatal", message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
