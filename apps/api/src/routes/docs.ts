import { Router } from "express";
import { prisma } from "../db/client.js";
import { postmanClient } from "../postman/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const docsRouter = Router({ mergeParams: true });

docsRouter.post(
  "/",
  asyncHandler<{ id: string }>(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!project.postmanCollectionId) {
      res.status(400).json({ error: "Generate a collection before publishing docs." });
      return;
    }

    try {
      const { docsUrl } = await postmanClient.publishDocumentation(project.postmanCollectionId);

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { docsUrl },
      });

      await prisma.syncRun.create({
        data: {
          projectId: project.id,
          type: "docs_publish",
          status: "success",
          resultJson: JSON.stringify({ docsUrl }),
        },
      });

      res.json(updated);
    } catch (err) {
      await prisma.syncRun.create({
        data: {
          projectId: project.id,
          type: "docs_publish",
          status: "failed",
          resultJson: JSON.stringify({ error: (err as Error).message }),
        },
      });
      res.status(502).json({ error: `Failed to publish docs: ${(err as Error).message}` });
    }
  })
);
