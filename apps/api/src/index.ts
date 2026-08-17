import { createApp } from "./app.js";
import { env } from "./env.js";
import { startDriftScheduler } from "./jobs/driftScheduler.js";
import { ensureSpecsRoot } from "./services/specStore.js";

// Defense in depth: every route is wrapped with asyncHandler so real request errors
// become clean 500 responses, but this guards against anything unexpected slipping
// through (e.g. in the background drift scheduler) so the whole process never dies.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection (server stays up):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server stays up):", err);
});

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
