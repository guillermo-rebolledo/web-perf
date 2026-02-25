import { describe, it, expect } from "vitest";
import {
  INSIGHT_FACTORIES,
  REGRESSION_TYPES,
  type InsightData,
} from "./seed-regression-helpers";

// ── Factory coverage ──────────────────────────────────────────────────────────

describe("INSIGHT_FACTORIES coverage", () => {
  it("every insight ID referenced in REGRESSION_TYPES has a factory", () => {
    const missing: string[] = [];

    for (const type of REGRESSION_TYPES) {
      for (const id of type.insights) {
        if (!INSIGHT_FACTORIES[id]) missing.push(`${type.name} → "${id}"`);
      }
    }

    expect(missing).toEqual([]);
  });
});

// ── Factory output shape ──────────────────────────────────────────────────────

describe("INSIGHT_FACTORIES output shape", () => {
  const RUN_ID = "test-run-id";
  const INDEX = 5;

  it.each(Object.entries(INSIGHT_FACTORIES))(
    'factory "%s" returns a valid InsightData object',
    (id, factory) => {
      const data: InsightData = factory(RUN_ID, INDEX);

      // Required fields are present with correct types
      expect(data.runId).toBe(RUN_ID);
      expect(data.insightId).toBe(id);
      expect(typeof data.title).toBe("string");
      expect(data.title.length).toBeGreaterThan(0);
      expect(typeof data.description).toBe("string");
      expect(data.description.length).toBeGreaterThan(0);
      expect(typeof data.score).toBe("number");
      expect(Array.isArray(data.sources)).toBe(true);
      expect(data.sources.length).toBeGreaterThan(0);
    },
  );

  it.each(Object.entries(INSIGHT_FACTORIES))(
    'factory "%s" returns a score in [0, 1]',
    (_id, factory) => {
      // Run several times to account for Math.random() variation
      for (let i = 0; i < 20; i++) {
        const { score } = factory(RUN_ID, i);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    },
  );
});

// ── Index-dependent factories ─────────────────────────────────────────────────

describe("index-dependent factory behaviour", () => {
  it("third-party-summary cycles through 5 distinct domains via index % 5", () => {
    const factory = INSIGHT_FACTORIES["third-party-summary"]!;
    const urls = Array.from({ length: 5 }, (_, i) => {
      const source = factory("run", i).sources[0] as { url: string };
      return source.url;
    });

    // All five domain slots should appear exactly once
    for (let d = 0; d < 5; d++) {
      expect(urls.some((u) => u.includes(`domain${d}.com`))).toBe(true);
    }

    // Index 5 should wrap back to domain0
    const wrappedSource = factory("run", 5).sources[0] as { url: string };
    expect(wrappedSource.url).toContain("domain0.com");
  });

  it("layout-shift-elements embeds the loop index in the selector", () => {
    const factory = INSIGHT_FACTORIES["layout-shift-elements"]!;
    const data7 = factory("run", 7);
    const data42 = factory("run", 42);

    expect(JSON.stringify(data7.sources)).toContain("element-7");
    expect(JSON.stringify(data42.sources)).toContain("element-42");
  });

  it("offscreen-images uses index in the image URL", () => {
    const factory = INSIGHT_FACTORIES["offscreen-images"]!;
    const src = factory("run", 3).sources[0] as { url: string };
    expect(src.url).toContain("image3.jpg");
  });

  it("uses-optimized-images uses index in the photo URL", () => {
    const factory = INSIGHT_FACTORIES["uses-optimized-images"]!;
    const src = factory("run", 9).sources[0] as { url: string };
    expect(src.url).toContain("photo9.png");
  });
});

// ── REGRESSION_TYPES configuration ───────────────────────────────────────────

describe("REGRESSION_TYPES configuration", () => {
  it("every type has a positive baseMultiplier greater than 1", () => {
    for (const type of REGRESSION_TYPES) {
      expect(type.baseMultiplier).toBeGreaterThan(1);
    }
  });

  it("every type has at least one insight", () => {
    for (const type of REGRESSION_TYPES) {
      expect(type.insights.length).toBeGreaterThan(0);
    }
  });

  it("metric names are unique across types", () => {
    const metrics = REGRESSION_TYPES.map((t) => t.metric);
    expect(new Set(metrics).size).toBe(metrics.length);
  });
});
