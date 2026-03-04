import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSlackPayload, sendSlackNotification, sendSlackTestMessage } from "@/lib/notifications/slack";
import type { NotificationContext } from "@/lib/notifications/types";

function makeCtx(overrides: Partial<NotificationContext> = {}): NotificationContext {
  return {
    appBaseUrl: "https://app.example.com",
    regressions: [],
    run: {
      id: "run-1",
      monitorId: "monitor-1",
      performanceScore: 85,
      lcp: 2500,
      cls: 0.1,
      inp: 200,
      fcp: 1800,
      ttfb: 600,
      finalUrl: "https://example.com",
      completedAt: new Date("2025-01-01T12:00:00Z"),
      monitor: {
        id: "monitor-1",
        strategy: "mobile",
        site: { name: "My Site", url: "https://example.com" },
        userId: "user-1",
      },
    },
    ...overrides,
  };
}

describe("buildSlackPayload", () => {
  it("includes the site name in the header", () => {
    const payload = buildSlackPayload(makeCtx());
    const json = JSON.stringify(payload);
    expect(json).toContain("My Site");
  });

  it("includes the performance score", () => {
    const payload = buildSlackPayload(makeCtx());
    const json = JSON.stringify(payload);
    expect(json).toContain("85");
  });

  it("sets green color when no regressions", () => {
    const payload = buildSlackPayload(makeCtx({ regressions: [] }));
    const attachment = (payload.attachments as { color: string }[])[0];
    expect(attachment.color).toBe("#22c55e");
  });

  it("sets orange color for minor/moderate regressions", () => {
    const payload = buildSlackPayload(
      makeCtx({
        regressions: [
          { metricName: "lcp", severity: "minor", percentChange: 15, baselineValue: 2000, actualValue: 2300 },
        ],
      }),
    );
    const attachment = (payload.attachments as { color: string }[])[0];
    expect(attachment.color).toBe("#f97316");
  });

  it("sets red color for critical regressions", () => {
    const payload = buildSlackPayload(
      makeCtx({
        regressions: [
          { metricName: "lcp", severity: "critical", percentChange: 50, baselineValue: 2000, actualValue: 3000 },
        ],
      }),
    );
    const attachment = (payload.attachments as { color: string }[])[0];
    expect(attachment.color).toBe("#ef4444");
  });

  it("omits regressions section when empty", () => {
    const payload = buildSlackPayload(makeCtx({ regressions: [] }));
    const json = JSON.stringify(payload);
    expect(json).not.toContain("Regressions detected");
  });

  it("includes regressions section when regressions present", () => {
    const payload = buildSlackPayload(
      makeCtx({
        regressions: [
          { metricName: "cls", severity: "moderate", percentChange: 25, baselineValue: 0.08, actualValue: 0.1 },
        ],
      }),
    );
    const json = JSON.stringify(payload);
    expect(json).toContain("Regressions detected");
    expect(json).toContain("CLS");
  });

  it("includes a view run link in the actions block", () => {
    const payload = buildSlackPayload(makeCtx());
    const json = JSON.stringify(payload);
    expect(json).toContain("https://app.example.com/runs/run-1");
  });

  it("formats millisecond metrics", () => {
    const payload = buildSlackPayload(makeCtx());
    const json = JSON.stringify(payload);
    // LCP 2500ms → "2.50 s"
    expect(json).toContain("2.50 s");
    // FCP 1800ms → "1.80 s"
    expect(json).toContain("1.80 s");
  });

  it("formats CLS with 3 decimal places", () => {
    const payload = buildSlackPayload(makeCtx());
    const json = JSON.stringify(payload);
    expect(json).toContain("0.100");
  });

  it("handles null score gracefully", () => {
    const ctx = makeCtx();
    ctx.run.performanceScore = null;
    const payload = buildSlackPayload(ctx);
    const json = JSON.stringify(payload);
    expect(json).toContain("—");
  });

  it("includes fallback text for mobile push", () => {
    const payload = buildSlackPayload(makeCtx());
    expect(typeof payload.text).toBe("string");
    expect(payload.text.length).toBeGreaterThan(0);
  });
});

describe("sendSlackNotification", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("POSTs to the webhook URL with JSON content-type", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await sendSlackNotification({ webhookUrl: "https://hooks.slack.com/test" }, makeCtx());
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("throws when webhook returns non-2xx", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => "Bad request" });
    await expect(
      sendSlackNotification({ webhookUrl: "https://hooks.slack.com/test" }, makeCtx()),
    ).rejects.toThrow("400");
  });
});

describe("sendSlackTestMessage", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("POSTs a verification message to the webhook URL", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await sendSlackTestMessage("https://hooks.slack.com/test");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string) as { text: string };
    expect(body.text).toContain("PerfLab connected");
  });

  it("throws when webhook returns non-2xx", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => "Forbidden" });
    await expect(sendSlackTestMessage("https://hooks.slack.com/test")).rejects.toThrow("403");
  });
});
