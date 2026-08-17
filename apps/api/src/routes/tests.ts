import { Router, type Request, type Response } from "express";
import { prisma } from "../db/client.js";
import { postmanClient } from "../postman/client.js";
import { runCollectionTests } from "../services/testRunner.js";

export const testsRouter = Router({ mergeParams: true });

testsRouter.post("/", async (req: Request<{ id: string }>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!project.postmanCollectionId) {
    res.status(400).json({ error: "Generate a collection before running tests." });
    return;
  }

  try {
    const collection = await postmanClient.getCollection(project.postmanCollectionId);
    const environmentId = typeof req.body?.environmentId === "string" ? req.body.environmentId : undefined;
    const environment = environmentId
      ? await postmanClient.getEnvironment(environmentId)
      : undefined;

    const summary = await runCollectionTests(collection, environment);

    const testRun = await prisma.testRun.create({
      data: {
        projectId: project.id,
        newmanReportJson: JSON.stringify(summary.report),
        passCount: summary.passCount,
        failCount: summary.failCount,
      },
    });

    res.json(testRun);
  } catch (err) {
    res.status(502).json({ error: `Failed to run tests: ${(err as Error).message}` });
  }
});

testsRouter.get("/", async (req: Request<{ id: string }>, res: Response) => {
  const runs = await prisma.testRun.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(runs);
});
