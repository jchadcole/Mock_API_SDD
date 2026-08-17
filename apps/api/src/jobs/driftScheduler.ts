import cron from "node-cron";
import { prisma } from "../db/client.js";
import { env } from "../env.js";
import { checkSpecDrift } from "../services/driftService.js";

/** Periodically checks every project with a synced spec for drift between repo and Spec Hub. */
export function startDriftScheduler(): void {
  if (env.driftCheckIntervalMinutes <= 0) {
    console.log("Drift scheduler disabled (DRIFT_CHECK_INTERVAL_MINUTES <= 0)");
    return;
  }

  const cronExpression = `*/${env.driftCheckIntervalMinutes} * * * *`;
  console.log(`Starting drift scheduler: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    const projects = await prisma.project.findMany({
      where: { postmanSpecId: { not: null } },
    });

    for (const project of projects) {
      try {
        const result = await checkSpecDrift(project.slug, project.postmanSpecId!);
        await prisma.driftCheck.create({
          data: {
            projectId: project.id,
            driftFound: result.driftFound,
            diffJson: JSON.stringify(result.diffs),
          },
        });
        if (result.driftFound) {
          console.warn(`Drift detected for project "${project.name}" (${project.slug})`);
        }
      } catch (err) {
        console.error(`Drift check failed for project "${project.name}":`, err);
      }
    }
  });
}
