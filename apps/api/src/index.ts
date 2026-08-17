import { createApp } from "./app.js";
import { env } from "./env.js";
import { startDriftScheduler } from "./jobs/driftScheduler.js";
import { ensureSpecsRoot } from "./services/specStore.js";

async function main() {
  await ensureSpecsRoot();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
    if (!env.postmanApiKey) {
      console.warn(
        "POSTMAN_API_KEY is not set - Postman sync/collection/mock/docs/drift actions will fail until it is configured."
      );
    }
  });

  startDriftScheduler();
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
