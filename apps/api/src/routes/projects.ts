import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import {
  relativeSpecPath,
  slugify,
  specFileExists,
  validateOpenApiSpec,
  writeSpecFile,
} from "../services/specStore.js";

export const projectsRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(1),
  specContent: z.string().min(1),
});

projectsRouter.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      syncRuns: { orderBy: { createdAt: "desc" }, take: 20 },
      testRuns: { orderBy: { createdAt: "desc" }, take: 20 },
      driftChecks: { orderBy: { checkedAt: "desc" }, take: 5 },
    },
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

projectsRouter.post("/", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, specContent } = parsed.data;
  const slug = slugify(name);

  if (await specFileExists(slug)) {
    res.status(409).json({ error: `A project with slug "${slug}" already exists.` });
    return;
  }

  try {
    await validateOpenApiSpec(specContent);
  } catch (err) {
    res.status(400).json({ error: `Invalid OpenAPI spec: ${(err as Error).message}` });
    return;
  }

  await writeSpecFile(slug, specContent);

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      specPath: relativeSpecPath(slug),
    },
  });

  res.status(201).json(project);
});

projectsRouter.delete("/:id", async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
