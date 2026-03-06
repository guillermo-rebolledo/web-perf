import "dotenv/config";
import { Worker } from "bullmq";
import { env } from "@/env";
import { AuditJobData, DigestJobData } from "@/lib/queue";
import { processAuditJob } from "./processor";
import { processDigestJob } from "./digest-processor";
import { startScheduler } from "./scheduler";

// Create a connection configuration
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Create the worker
const worker = new Worker<AuditJobData>(
  "performance-audits",
  async (job) => {
    await processAuditJob(job);
  },
  {
    connection,
    concurrency: 1, // Process one job at a time initially
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per 60 seconds (respecting PSI API limits)
    },
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
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
  console.log(`[DigestWorker] Job ${job.id} completed`);
});

digestWorker.on("failed", (job, err) => {
  console.error(`[DigestWorker] Job ${job?.id} failed:`, err);
});

// Start the scheduler
startScheduler();

// Graceful shutdown
const shutdown = async () => {
  console.log("[Worker] Shutting down gracefully...");
  await Promise.all([worker.close(), digestWorker.close()]);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[Worker] Worker and scheduler started successfully");
console.log(`[Worker] Connected to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
console.log("[Worker] Waiting for jobs...");
