import * as newman from "newman";
import type { NewmanRunSummary } from "newman";

export interface TestRunSummary {
  passCount: number;
  failCount: number;
  report: unknown;
}

/**
 * Runs a Postman collection with Newman against an optional environment and returns a
 * summarized report. Collection/environment JSON should be fetched from the Postman API
 * beforehand (postmanClient.getCollection / getEnvironment).
 */
export function runCollectionTests(
  collection: unknown,
  environment?: unknown
): Promise<TestRunSummary> {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: collection as any,
        environment: environment as any,
        reporters: [],
      },
      (err: Error | null, summary: NewmanRunSummary) => {
        if (err) {
          reject(err);
          return;
        }

        const failCount = summary.run.stats.assertions.failed;
        const passCount = summary.run.stats.assertions.total - failCount;

        resolve({
          passCount,
          failCount,
          report: {
            stats: summary.run.stats,
            failures: summary.run.failures.map((f) => ({
              source: f.source?.name,
              error: f.error?.message,
            })),
          },
        });
      }
    );
  });
}
