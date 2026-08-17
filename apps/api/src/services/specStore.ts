import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import SwaggerParser from "@apidevtools/swagger-parser";
import { env } from "../env.js";

const specsRootAbsolute = path.resolve(process.cwd(), env.specsRoot);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function projectSpecPath(slug: string): string {
  return path.join(specsRootAbsolute, slug, "openapi.yaml");
}

export function relativeSpecPath(slug: string): string {
  return `specs/${slug}/openapi.yaml`;
}

export async function ensureSpecsRoot(): Promise<void> {
  await fs.mkdir(specsRootAbsolute, { recursive: true });
}

export async function readSpecFile(slug: string): Promise<string> {
  return fs.readFile(projectSpecPath(slug), "utf-8");
}

export async function writeSpecFile(slug: string, content: string): Promise<void> {
  const filePath = projectSpecPath(slug);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

export async function specFileExists(slug: string): Promise<boolean> {
  try {
    await fs.access(projectSpecPath(slug));
    return true;
  } catch {
    return false;
  }
}

/** Validates an OpenAPI 3.x document (YAML or JSON string). Throws with a helpful message if invalid. */
export async function validateOpenApiSpec(content: string): Promise<void> {
  const parsed = yaml.load(content);
  await SwaggerParser.validate(parsed as any);
}

export function parseSpecToObject(content: string): unknown {
  return yaml.load(content);
}

export { slugify };
