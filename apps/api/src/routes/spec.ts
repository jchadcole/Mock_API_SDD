import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { postmanClient } from "../postman/client.js";
import { readSpecFile, validateOpenApiSpec, writeSpecFile } from "../services/specStore.js";

export const specRouter = Router({ mergeParams: true });

const updateSpecSchema = z.object({
  content: z.string().min(1),
});

async function getProjectOr404(id: string, res: Response) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  return project;
}

/** GET current spec content from the repo. */
specRouter.get("/", async (req: Request<{ id: string }>, res: Response) => {
  const project = await getProjectOr404(req.params.id, res);
  if (!project) return;
  const content = await readSpecFile(project.slug);
  res.json({ content });
});

/** PUT new spec content: validate, write to repo, then push to Postman Spec Hub. */
specRouter.put("/", async (req: Request<{ id: string }>, res: Response) => {
  const project = await getProjectOr404(req.params.id, res);
  if (!project) return;

  const parsed = updateSpecSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    await validateOpenApiSpec(parsed.data.content);
  } catch (err) {
    res.status(400).json({ error: `Invalid OpenAPI spec: ${(err as Error).message}` });
    return;
  }

  await writeSpecFile(project.slug, parsed.data.content);

  res.json({ ok: true });
});

/** POST: push the current repo spec to Postman's Spec Hub (create if needed, else update). */
specRouter.post("/sync", async (req: Request<{ id: string }>, res: Response) => {
  const project = await getProjectOr404(req.params.id, res);
  if (!project) return;

  const content = await readSpecFile(project.slug);

  try {
    let specId = project.postmanSpecId;

    if (!specId) {
      const spec = await postmanClient.createSpec({
        name: project.name,
        files: [{ path: "index.yaml", content }],
      });
      specId = spec.id;
    } else {
      await postmanClient.updateSpecFile(specId, "index.yaml", content);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { postmanSpecId: specId },
    });

    await prisma.syncRun.create({
      data: {
        projectId: project.id,
        type: "spec_push",
        status: "success",
        resultJson: JSON.stringify({ postmanSpecId: specId }),
      },
    });

    res.json(updated);
  } catch (err) {
    await prisma.syncRun.create({
      data: {
        projectId: project.id,
        type: "spec_push",
        status: "failed",
        resultJson: JSON.stringify({ error: (err as Error).message }),
      },
    });
    res.status(502).json({ error: `Failed to sync spec to Postman: ${(err as Error).message}` });
  }
});
