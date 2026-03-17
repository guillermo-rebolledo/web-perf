import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordActivity, ENTITY_TYPE_MAP } from "@/lib/activity";

const mockCreate = vi.fn();
const mockPrisma = {
  activityEvent: { create: mockCreate },
} as unknown as import("@prisma/client").PrismaClient;

describe("recordActivity", () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({});
  });

  it("creates a site_created event", async () => {
    await recordActivity(mockPrisma, "user1", "site_created", "site1", {
      type: "site_created",
      siteName: "My Site",
      siteUrl: "https://example.com",
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user1",
        type: "site_created",
        entityId: "site1",
        entityType: "site",
        metadata: { type: "site_created", siteName: "My Site", siteUrl: "https://example.com" },
      },
    });
  });

  it("creates a run_completed event", async () => {
    await recordActivity(mockPrisma, "user1", "run_completed", "run1", {
      type: "run_completed",
      siteName: "My Site",
      siteUrl: "https://example.com",
      siteId: "site1",
      monitorId: "monitor1",
      performanceScore: 92,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "run_completed", entityType: "run" }),
      })
    );
  });

  it("propagates DB errors", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    await expect(
      recordActivity(mockPrisma, "user1", "site_created", "site1", {
        type: "site_created",
        siteName: "My Site",
        siteUrl: "https://example.com",
      })
    ).rejects.toThrow("DB error");
  });
});

describe("ENTITY_TYPE_MAP", () => {
  it("maps site_created to site", () => {
    expect(ENTITY_TYPE_MAP.site_created).toBe("site");
  });
  it("maps monitor_created to monitor", () => {
    expect(ENTITY_TYPE_MAP.monitor_created).toBe("monitor");
  });
  it("maps run_completed to run", () => {
    expect(ENTITY_TYPE_MAP.run_completed).toBe("run");
  });
  it("maps run_failed to run", () => {
    expect(ENTITY_TYPE_MAP.run_failed).toBe("run");
  });
  it("maps regression_detected to run", () => {
    expect(ENTITY_TYPE_MAP.regression_detected).toBe("run");
  });
  it("maps deployment_run_triggered to run", () => {
    expect(ENTITY_TYPE_MAP.deployment_run_triggered).toBe("run");
  });
});
