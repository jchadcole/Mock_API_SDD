import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  postmanApiKey: process.env.POSTMAN_API_KEY ?? "",
  postmanWorkspaceId: process.env.POSTMAN_WORKSPACE_ID ?? "",
  driftCheckIntervalMinutes: Number(process.env.DRIFT_CHECK_INTERVAL_MINUTES ?? 30),
  specsRoot: process.env.SPECS_ROOT ?? "../../specs",
};

export function assertPostmanConfigured() {
  if (!env.postmanApiKey) {
    throw new Error(
      "POSTMAN_API_KEY is not set. Add it to your .env file (see .env.example)."
    );
  }
}

export { required };
