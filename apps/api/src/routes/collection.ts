import { Router } from "express";
import { prisma } from "../db/client.js";
import { postmanClient } from "../postman/client.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const collectionRouter = Router({ mergeParams: true });

/**
 * Generates a collection from the project's spec (first time), or syncs the existing
 * collection with the latest spec (subsequent runs). Both are async Postman operations,
 * so we poll until they settle before responding.
 */
collectionRouter.post(
  "/sync",
  asyncHandler<{ id: string }>(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!project.postmanSpecId) {
      res.status(400).json({ error: "Push the spec to Postman before generating a collection." });
      return;
    }

    try {
      let collectionId = project.postmanCollectionId;

      if (!collectionId) {
        const { taskId } = await postmanClient.generateCollection(
          project.postmanSpecId,
          `${project.name} collection`
        );
        const result = await postmanClient.pollTask(() =>
          postmanClient.getSpecTaskStatus(project.postmanSpecId!, taskId)
        );
        const generatedId = result.details?.resources?.[0]?.id;
        if (result.status === "failed" || !generatedId) {
          throw new Error(result.error ?? "Collection generation failed");
        }
        // Postman returns this id already in `ownerId-uuid` UID form, which is what every
        // other collection endpoint (getCollection, createMock, sync-with-spec, docs) expects.
        collectionId = generatedId;
      } else {
        const syncResult = await postmanClient.syncCollectionWithSpec(
          project.postmanSpecId,
          collectionId
        );
        if (!("alreadyInSync" in syncResult)) {
          const result = await postmanClient.pollTask(() =>
            postmanClient.getCollectionTaskStatus(collectionId!, syncResult.taskId)
          );
          if (result.status === "failed") {
            throw new Error(result.error ?? "Collection sync failed");
          }
        }
      }

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { postmanCollectionId: collectionId },
      });

      await prisma.syncRun.create({
        data: {
          projectId: project.id,
          type: "collection_sync",
          status: "success",
          resultJson: JSON.stringify({ postmanCollectionId: collectionId }),
        },
      });

      res.json(updated);
    } catch (err) {
      await prisma.syncRun.create({
        data: {
          projectId: project.id,
          type: "collection_sync",
          status: "failed",
          resultJson: JSON.stringify({ error: (err as Error).message }),
        },
      });
      res.status(502).json({ error: `Failed to sync collection: ${(err as Error).message}` });
    }
  })
);

collectionRouter.get(
  "/",
  asyncHandler<{ id: string }>(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!project.postmanCollectionId) {
      res.status(404).json({ error: "No collection generated yet" });
      return;
    }
    const collection = await postmanClient.getCollection(project.postmanCollectionId);
    res.json(collection);
  })
);
