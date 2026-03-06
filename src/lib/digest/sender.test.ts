import { describe, it, expect, vi, beforeEach } from "vitest";
import { subDays } from "date-fns";

vi.mock("@/env", () => ({
  env: {
    RESEND_API_KEY: "test-resend-key",
    RESEND_FROM_EMAIL: "digest@test.com",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "test-secret",
    NODE_ENV: "test",
  },
}));

vi.mock("@react-email/components", () => ({
  render: vi.fn().mockResolvedValue("<html>digest</html>"),
  Html: ({ children }: { children: unknown }) => children,
  Head: () => null,
  Body: ({ children }: { children: unknown }) => children,
  Container: ({ children }: { children: unknown }) => children,
  Section: ({ children }: { children: unknown }) => children,
  Row: ({ children }: { children: unknown }) => children,
  Column: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  Button: ({ children }: { children: unknown }) => children,
  Link: ({ children }: { children: unknown }) => children,
  Hr: () => null,
  Preview: () => null,
}));

vi.mock("@/lib/digest/unsubscribe-token", () => ({
  generateUnsubscribeToken: vi.fn().mockReturnValue("mock-token"),
}));

// vi.mock is hoisted — declare mockSend via vi.hoisted so it's in scope
const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("resend", () => ({
  // Use a real class so `new Resend()` works in all ESM environments
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { sendDigestEmail } from "./sender";
import type { UserDigestData } from "./aggregator";

const now = new Date();
const makeData = (overrides: Partial<UserDigestData> = {}): UserDigestData => ({
  user: { id: "user-1", email: "recipient@example.com", name: "Alice" },
  weekRange: { start: subDays(now, 7), end: now },
  sites: [
    {
      site: { id: "site-1", name: "Acme", url: "https://acme.com" },
      monitorId: "mon-1",
      strategy: "mobile",
      thisWeek: {
        avgPerformanceScore: 78,
        avgAccessibilityScore: 85,
        avgSeoScore: 90,
        avgBestPracticesScore: 75,
        avgLcp: 2300,
        avgCls: 0.05,
        avgInp: 160,
        runCount: 5,
      },
      lastWeek: {
        avgPerformanceScore: 82,
        avgAccessibilityScore: 88,
        avgSeoScore: 91,
        avgBestPracticesScore: 79,
        avgLcp: 2100,
        avgCls: 0.04,
        avgInp: 140,
        runCount: 5,
      },
      trend: "declining",
      openAlerts: { critical: 1, moderate: 0, minor: 2 },
      topRegressions: [
        {
          metricName: "lcp",
          severity: "critical",
          percentChange: 30,
          siteName: "Acme",
          siteUrl: "https://acme.com",
        },
      ],
    },
  ],
  summary: {
    totalSites: 1,
    sitesImproving: 0,
    sitesDeclining: 1,
    totalCriticalAlerts: 1,
  },
  ...overrides,
});

describe("sendDigestEmail", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("sends to the correct recipient", async () => {
    mockSend.mockResolvedValue({ error: null });
    await sendDigestEmail(makeData());
    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0] as { to: string };
    expect(call.to).toBe("recipient@example.com");
  });

  it("sends from the configured address", async () => {
    mockSend.mockResolvedValue({ error: null });
    await sendDigestEmail(makeData());
    const call = mockSend.mock.calls[0][0] as { from: string };
    expect(call.from).toBe("digest@test.com");
  });

  it("includes 'PerfLabs Weekly Digest' in subject", async () => {
    mockSend.mockResolvedValue({ error: null });
    await sendDigestEmail(makeData());
    const call = mockSend.mock.calls[0][0] as { subject: string };
    expect(call.subject).toContain("PerfLabs Weekly Digest");
  });

  it("includes List-Unsubscribe header for CAN-SPAM compliance", async () => {
    mockSend.mockResolvedValue({ error: null });
    await sendDigestEmail(makeData());
    const call = mockSend.mock.calls[0][0] as {
      headers: Record<string, string>;
    };
    expect(call.headers["List-Unsubscribe"]).toContain("mock-token");
    expect(call.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click"
    );
  });

  it("throws when Resend returns an error", async () => {
    mockSend.mockResolvedValue({ error: { message: "invalid_api_key" } });
    await expect(sendDigestEmail(makeData())).rejects.toThrow("invalid_api_key");
  });
});
