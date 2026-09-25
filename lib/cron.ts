// lib/cron.ts
import cron from "node-cron";
import { assertCapability } from "./config/runtime";

const BASE_URL =
  process.env.UTOM_INTERNAL_BASE_URL || "http://127.0.0.1:3000";

async function runInternalEndpoint(
  endpoint: "/api/fetch-feed" | "/api/summarize-all"
): Promise<unknown> {
  const token = process.env.UTOM_INTERNAL_WORKER_TOKEN;

  if (!token || token.length < 32) {
    throw new Error(
      "UTOM_INTERNAL_WORKER_TOKEN nincs beállítva vagy túl rövid."
    );
  }

  const response = await fetch(new URL(endpoint, BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(`${endpoint}: HTTP ${response.status}`);
  }

  return response.json();
}

let running = false;

export function startLegacyCron() {
  assertCapability("backgroundJobs");

  return cron.schedule(
    "*/5 * * * *",
    async () => {
      // Ne indítsunk új feldolgozást,
      // ha az előző ötperces ciklus még tart.
      if (running) {
        console.warn(
          "Cron: az előző feldolgozás még fut, ezt a ciklust kihagyjuk."
        );
        return;
      }

      running = true;

      try {
        console.log(
          "Automatikus frissítés indul:",
          new Date().toLocaleString("hu-HU")
        );

        const feedData =
          await runInternalEndpoint("/api/fetch-feed");

        console.log("Feed feldolgozás eredménye:", feedData);

        const summaryData =
          await runInternalEndpoint("/api/summarize-all");

        console.log("Összefoglalás eredménye:", summaryData);

        console.log("Automatikus frissítés befejezve.");
      } catch (error) {
        console.error("Automatikus frissítés hibája:", error);
      } finally {
        running = false;
      }
    },
    { noOverlap: true }
  );
}