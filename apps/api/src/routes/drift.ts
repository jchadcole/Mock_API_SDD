import { Router } from "express";
import { prisma } from "../db/client.js";
import { checkSpecDrift } from "../services/driftService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const driftRouter = Router({ mergeParams: true });

driftRouter.post(
  "/check",
  asyncHandler<{ id: string }>(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!project.postmanSpecId) {
      res.status(400).json({ error: "Push the spec to Postman before checking drift." });
      return;
    }

    try {
      const result = await checkSpecDrift(project.slug, project.postmanSpecId);

      const driftCheck = await prisma.driftCheck.create({
        data: {
          projectId: project.id,
          driftFound: result.driftFound,
          diffJson: JSON.stringify(result.diffs),
        },
      });

      res.json(driftCheck);
    } catch (err) {
      res.status(502).json({ error: `Failed to check drift: ${(err as Error).message}` });
    }
  })
);

driftRouter.get(
  "/",
  asyncHandler<{ id: string }>(async (req, res) => {
    const checks = await prisma.driftCheck.findMany({
      where: { projectId: req.params.id },
      orderBy: { checkedAt: "desc" },
      take: 20,
    });
    res.json(checks);
  })
);
