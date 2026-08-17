import diff from "deep-diff";
import yaml from "js-yaml";
import { postmanClient } from "../postman/client.js";
import { readSpecFile } from "./specStore.js";

export interface DriftResult {
  driftFound: boolean;
  diffs: unknown[];
}

/**
 * Compares the repo's local OpenAPI spec (source of truth) against the spec definition
 * currently stored in Postman's Spec Hub. Any structural difference means someone edited
 * one side (repo or Postman UI) without updating the other.
 */
export async function checkSpecDrift(
  slug: string,
  postmanSpecId: string
): Promise<DriftResult> {
  const localContent = await readSpecFile(slug);
  const remoteContent = await postmanClient.getSpecDefinition(postmanSpecId);

  const localObj = yaml.load(localContent);
  const remoteObj = yaml.load(remoteContent);

  const diffs = diff.diff(remoteObj, localObj) ?? [];
  return {
    driftFound: diffs.length > 0,
    diffs,
  };
}

/**
 * Compares the live Postman collection against what the spec would generate, to catch
 * manual edits made directly in Postman (outside of the sync-with-spec flow).
 */
export async function checkCollectionDrift(
  collectionId: string,
  expectedCollection: unknown
): Promise<DriftResult> {
  const liveCollection = await postmanClient.getCollection(collectionId);
  const diffs = diff.diff(expectedCollection, liveCollection) ?? [];
  return {
    driftFound: diffs.length > 0,
    diffs,
  };
}
