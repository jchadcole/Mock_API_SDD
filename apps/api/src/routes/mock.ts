import { Router } from "express";
import { prisma } from "../db/client.js";
import { postmanClient } from "../postman/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const mockRouter = Router({ mergeParams: true });

mockRouter.post(
  "/",
  asyncHandler<{ id: string }>(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!project.postmanCollectionId) {
      res.status(400).json({ error: "Generate a collection before creating a mock." });
      return;
    }

    try {
      const mock = await postmanClient.createMock({
        collectionId: project.postmanCollectionId,
        name: `${project.name} mock`,
      });

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { postmanMockId: mock.id, postmanMockUrl: mock.url },
      });

      await prisma.syncRun.create({
        data: {
          projectId: project.id,
          type: "mock_create",
          status: "success",
          resultJson: JSON.stringify(mock),
        },
      });

      res.json(updated);
    } catch (err) {
      await prisma.syncRun.create({
        data: {
          projectId: project.id,
          type: "mock_create",
          status: "failed",
          resultJson: JSON.stringify({ error: (err as Error).message }),
        },
      });
      res.status(502).json({ error: `Failed to create mock: ${(err as Error).message}` });
    }
  })
);
