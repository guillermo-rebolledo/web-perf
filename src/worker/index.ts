import "dotenv/config";
import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";
import { env } from "@/env";
import { AuditJobData, DigestJobData } from "@/lib/queue";
import { processAuditJob } from "./processor";
import { processDigestJob } from "./digest-processor";
import { startScheduler } from "./scheduler";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("Worker");
const digestLog = createLogger("DigestWorker");

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: env.NODE_ENV === "production",
  sendDefaultPii: true,
  tracesSampleRate: 0.1,
  environment: env.NODE_ENV,
});

// Create a connection configuration
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
};

/**
 * Mark any runs still in "running" state as "failed".
 * These are orphaned runs from a previous worker process that crashed mid-job.
 */
async function recoverOrphanedRuns(): Promise<void> {
  const result = await prisma.run.updateMany({
    where: { status: "running" },
    data: {
      status: "failed",
      errorMessage: "Worker restarted — run was interrupted",
    },
  });
  if (result.count > 0) {
    log.warn("Recovered orphaned runs from previous crash", { count: result.count });
  }
}

// Create the worker
const worker = new Worker<AuditJobData>(
  "performance-audits",
  async (job) => {
    await processAuditJob(job);
  },
  {
    connection,
    concurrency: 1, // Process one job at a time initially
    lockDuration: 300_000, // 5 minutes — PSI audits can take 30–90s; give ample headroom
    stalledInterval: 30_000, // Check for stalled jobs every 30 seconds
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per 60 seconds (respecting PSI API limits)
    },
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  log.info("Job completed", { jobId: job.id });
});

worker.on("failed", (job, err) => {
  Sentry.captureException(err, {
    tags: { worker: "performance-audits", jobId: job?.id },
  });
  log.error("Job failed", err, { jobId: job?.id });
});

worker.on("error", (err) => {
  Sentry.captureException(err, { tags: { worker: "performance-audits" } });
  log.error("Worker error", err);
});

// Digest worker
const digestWorker = new Worker<DigestJobData>(
  "weekly-digest",
  async () => {
    await processDigestJob();
  },
  { connection, concurrency: 1 }
);

digestWorker.on("completed", (job) => {
  digestLog.info("Job completed", { jobId: job.id });
});

digestWorker.on("failed", (job, err) => {
  Sentry.captureException(err, {
    tags: { worker: "weekly-digest", jobId: job?.id },
  });
  digestLog.error("Job failed", err, { jobId: job?.id });
});

// Graceful shutdown
const shutdown = async () => {
  log.info("Shutting down gracefully");
  await Promise.all([worker.close(), digestWorker.close()]);
  await Sentry.close(2000);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Recover orphaned runs from a previous crash before accepting new jobs, then start
void (async () => {
  await recoverOrphanedRuns();
  startScheduler();
  log.info("Worker and scheduler started", {
    redis: `${env.REDIS_HOST}:${env.REDIS_PORT}`,
  });
})();
