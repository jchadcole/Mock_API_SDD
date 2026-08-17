/**
 * Minimal ambient typing for the `newman` package. The official @types/newman defs are
 * frequently out of sync with `postman-collection`'s own bundled types, so we declare just
 * enough surface area for our usage rather than pulling in that dependency.
 */
declare module "newman" {
  export interface NewmanRunSummary {
    run: {
      stats: {
        assertions: {
          total: number;
          failed: number;
        };
        [key: string]: unknown;
      };
      failures: Array<{
        source?: { name?: string };
        error?: { message?: string };
      }>;
    };
  }

  export interface NewmanRunOptions {
    collection: unknown;
    environment?: unknown;
    reporters?: string[];
    [key: string]: unknown;
  }

  export function run(
    options: NewmanRunOptions,
    callback: (err: Error | null, summary: NewmanRunSummary) => void
  ): void;
}
