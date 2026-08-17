import cors from "cors";
import express from "express";
import { collectionRouter } from "./routes/collection.js";
import { docsRouter } from "./routes/docs.js";
import { driftRouter } from "./routes/drift.js";
import { mockRouter } from "./routes/mock.js";
import { projectsRouter } from "./routes/projects.js";
import { specRouter } from "./routes/spec.js";
import { testsRouter } from "./routes/tests.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:id/spec", specRouter);
  app.use("/api/projects/:id/collection", collectionRouter);
  app.use("/api/projects/:id/mock", mockRouter);
  app.use("/api/projects/:id/docs", docsRouter);
  app.use("/api/projects/:id/tests", testsRouter);
  app.use("/api/projects/:id/drift", driftRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
