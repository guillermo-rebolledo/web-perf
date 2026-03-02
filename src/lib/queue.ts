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
