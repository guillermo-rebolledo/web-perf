import { Queue } from "bullmq";
import { env } from "@/env";

export interface AuditJobData {
  runId: string;
  monitorId: string;
  siteUrl: string;
  strategy: "mobile" | "desktop";
}

// Create a connection configuration
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Create the audit queue
const auditQueue = new Queue<AuditJobData>("performance-audits", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 86400, // 24 hours
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
      age: 86400 * 7, // 7 days
    },
  },
});

export async function enqueueAuditJob(data: AuditJobData): Promise<string> {
  const job = await auditQueue.add("audit" as const, data, {
    jobId: data.runId, // Use runId as jobId for idempotency
  });
  return job.id!;
}

// ── Weekly Digest ───────────────────────────────────────────────────────────

export interface DigestJobData {
  triggeredAt: string; // ISO timestamp for logging/idempotency
}

const digestQueue = new Queue<DigestJobData>("weekly-digest", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 10, age: 86400 * 7 },
    removeOnFail: { count: 10, age: 86400 * 7 },
  },
});

/**
 * Enqueues a weekly digest job. Uses an ISO week-based jobId for idempotency
 * — only one digest job can exist per calendar week.
 */
export async function enqueueDigestJob(): Promise<string> {
  const now = new Date();
  // ISO week string: "2026-W10" — ensures at-most-once per week
  const weekLabel = `${now.getUTCFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  const job = await digestQueue.add(
    "weekly-digest",
    { triggeredAt: now.toISOString() },
    { jobId: `digest-${weekLabel}` }
  );
  return job.id!;
}

/** Returns the ISO week number (1–53) for a given date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
