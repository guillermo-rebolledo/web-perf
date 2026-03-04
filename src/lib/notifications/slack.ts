import { z } from "zod";
import type { NotificationContext, NotificationRegression } from "./types";

export const slackConfigSchema = z.object({
  type: z.literal("slack"),
  webhookUrl: z.string().url(),
});

// ---- Formatting helpers ----

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

function fmtCls(val: number | null): string {
  if (val === null) return "—";
  return val.toFixed(3);
}

function fmtScore(score: number | null): string {
  if (score === null) return "—";
  return String(Math.round(score));
}

function scoreEmoji(score: number | null): string {
  if (score === null) return "⚪";
  if (score >= 90) return "🟢";
  if (score >= 50) return "🟡";
  return "🔴";
}

function severityColor(regressions: NotificationRegression[]): string {
  if (regressions.length === 0) return "#22c55e"; // green
  const hasCritical = regressions.some((r) => r.severity === "critical");
  if (hasCritical) return "#ef4444"; // red
  return "#f97316"; // orange
}

function metricField(label: string, value: string) {
  return { type: "mrkdwn", text: `*${label}*\n${value}` };
}

// ---- Payload builder ----

export function buildSlackPayload(ctx: NotificationContext) {
  const { run, regressions, appBaseUrl } = ctx;
  const runUrl = `${appBaseUrl}/runs/${run.id}`;
  const score = run.performanceScore;
  const emoji = scoreEmoji(score);

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${run.monitor.site.name} — Audit Complete`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        metricField("Performance", fmtScore(score)),
        metricField("Strategy", run.monitor.strategy.toUpperCase()),
        metricField("LCP", fmtMs(run.lcp)),
        metricField("CLS", fmtCls(run.cls)),
        metricField("INP", fmtMs(run.inp)),
        metricField("FCP", fmtMs(run.fcp)),
        metricField("TTFB", fmtMs(run.ttfb)),
        metricField(
          "Completed",
          run.completedAt
            ? new Date(run.completedAt).toUTCString()
            : "Unknown",
        ),
      ],
    },
  ];

  if (regressions.length > 0) {
    const lines = regressions.map((r) => {
      const pct = r.percentChange > 0 ? `+${r.percentChange.toFixed(1)}%` : `${r.percentChange.toFixed(1)}%`;
      return `• *${r.metricName.toUpperCase()}* — ${pct} (${r.severity})`;
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Regressions detected:*\n${lines.join("\n")}`,
      },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View Run →", emoji: true },
        url: runUrl,
        action_id: "view_run",
      },
    ],
  });

  const fallbackText = regressions.length > 0
    ? `${run.monitor.site.name}: Performance ${fmtScore(score)} — ${regressions.length} regression(s) detected`
    : `${run.monitor.site.name}: Performance ${fmtScore(score)} — No regressions`;

  return {
    text: fallbackText,
    attachments: [
      {
        color: severityColor(regressions),
        blocks,
      },
    ],
  };
}

// ---- Send helpers ----

export async function sendSlackNotification(
  config: { webhookUrl: string },
  ctx: NotificationContext,
): Promise<void> {
  const payload = buildSlackPayload(ctx);
  const res = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
  }
}

export async function sendSlackTestMessage(webhookUrl: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "✅ *PerfLab connected!* Your Slack integration is working correctly.",
    }),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
  }
}
