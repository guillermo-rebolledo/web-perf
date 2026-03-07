import { test, expect } from "@playwright/test";
import {
  TEST_SITE,
  seedSitesAtLimit,
  cleanupLimitSites,
  seedMonitorsAtLimit,
  cleanupLimitMonitors,
  seedIntegrationsAtLimit,
  cleanupLimitIntegrations,
  disconnect,
} from "./helpers/seed";

// Run serially so DB mutations don't race with other specs or each other.
test.describe.serial("API - Resource Limits (Authenticated)", () => {
  test.afterAll(async () => {
    await disconnect();
  });

  test("POST /api/sites returns 422 when user is at site limit", async ({
    request,
  }) => {
    await seedSitesAtLimit();
    try {
      const res = await request.post("/api/sites", {
        data: { name: "Over Limit", url: "https://over-limit-site.example.com" },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.error).toContain("limit reached");
    } finally {
      await cleanupLimitSites();
    }
  });

  test("POST /api/monitors returns 422 when site is at monitor limit", async ({
    request,
  }) => {
    await seedMonitorsAtLimit();
    try {
      const res = await request.post("/api/monitors", {
        data: {
          siteId: TEST_SITE.id,
          cadenceMinutes: 1440,
          strategy: "mobile",
        },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.error).toContain("limit reached");
    } finally {
      await cleanupLimitMonitors();
    }
  });

  test("POST /api/integrations returns 422 when user is at integration limit", async ({
    request,
  }) => {
    await seedIntegrationsAtLimit();
    try {
      const res = await request.post("/api/integrations", {
        data: {
          name: "Over Limit",
          type: "slack",
          webhookUrl: "https://hooks.slack.com/services/over-limit",
        },
      });
      expect(res.status()).toBe(422);
      const body = await res.json();
      expect(body.error).toContain("limit reached");
    } finally {
      await cleanupLimitIntegrations();
    }
  });

  test("POST /api/sites succeeds once a site is deleted (limit freed)", async ({
    request,
  }) => {
    await seedSitesAtLimit();
    try {
      // Confirm we're at the limit.
      const blockedRes = await request.post("/api/sites", {
        data: { name: "Should Fail", url: "https://should-fail.example.com" },
      });
      expect(blockedRes.status()).toBe(422);

      // List sites and delete one of the limit-seeded ones to free a slot.
      const sites = await (await request.get("/api/sites")).json();
      const limitSite = sites.find((s: { name: string }) =>
        s.name.startsWith("Limit Site")
      );
      expect(limitSite).toBeDefined();
      await request.delete(`/api/sites/${limitSite.id}`);

      // Now creation should succeed.
      const okRes = await request.post("/api/sites", {
        data: { name: "Now OK", url: "https://now-ok.example.com" },
      });
      expect(okRes.status()).toBe(201);

      // Clean up the newly created site.
      const created = await okRes.json();
      await request.delete(`/api/sites/${created.id}`);
    } finally {
      await cleanupLimitSites();
    }
  });
});
