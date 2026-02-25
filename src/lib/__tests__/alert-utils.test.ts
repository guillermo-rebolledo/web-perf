import { describe, it, expect } from "vitest";
import {
  formatMetricValue,
  getMetricUnit,
  getSeverityInfo,
  getConfidenceInfo,
  isSeverityLevel,
  isConfidenceLevel,
  parseRegressionCauses,
  parseDiffSummary,
  severityConfig,
  confidenceConfig,
  type RegressionCause,
  type DiffSummary,
} from "../alert-utils";

describe("formatMetricValue", () => {
  it("formats CLS values with 3 decimal places", () => {
    expect(formatMetricValue(0.12345, "cls")).toBe("0.123");
    expect(formatMetricValue(0.1, "cls")).toBe("0.100");
  });

  it("rounds non-CLS values to nearest integer", () => {
    expect(formatMetricValue(2543.7, "lcp")).toBe("2544");
    expect(formatMetricValue(1234.2, "fcp")).toBe("1234");
    expect(formatMetricValue(999.9, "ttfb")).toBe("1000");
  });

  it("handles zero values", () => {
    expect(formatMetricValue(0, "cls")).toBe("0.000");
    expect(formatMetricValue(0, "lcp")).toBe("0");
  });
});

describe("getMetricUnit", () => {
  it("returns empty string for CLS", () => {
    expect(getMetricUnit("cls")).toBe("");
  });

  it("returns ms for other metrics", () => {
    expect(getMetricUnit("lcp")).toBe("ms");
    expect(getMetricUnit("fcp")).toBe("ms");
    expect(getMetricUnit("ttfb")).toBe("ms");
    expect(getMetricUnit("tbt")).toBe("ms");
  });
});

describe("isSeverityLevel", () => {
  it("returns true for valid severity levels", () => {
    expect(isSeverityLevel("critical")).toBe(true);
    expect(isSeverityLevel("moderate")).toBe(true);
    expect(isSeverityLevel("minor")).toBe(true);
  });

  it("returns false for invalid severity levels", () => {
    expect(isSeverityLevel("high")).toBe(false);
    expect(isSeverityLevel("low")).toBe(false);
    expect(isSeverityLevel("")).toBe(false);
    expect(isSeverityLevel("unknown")).toBe(false);
  });
});

describe("isConfidenceLevel", () => {
  it("returns true for valid confidence levels", () => {
    expect(isConfidenceLevel("high")).toBe(true);
    expect(isConfidenceLevel("medium")).toBe(true);
    expect(isConfidenceLevel("low")).toBe(true);
  });

  it("returns false for invalid confidence levels", () => {
    expect(isConfidenceLevel("critical")).toBe(false);
    expect(isConfidenceLevel("")).toBe(false);
    expect(isConfidenceLevel("unknown")).toBe(false);
  });
});

describe("getSeverityInfo", () => {
  it("returns correct info for valid severity levels", () => {
    expect(getSeverityInfo("critical")).toEqual(severityConfig.critical);
    expect(getSeverityInfo("moderate")).toEqual(severityConfig.moderate);
    expect(getSeverityInfo("minor")).toEqual(severityConfig.minor);
  });

  it("returns minor config as fallback for invalid severity", () => {
    const fallbackInvalid = getSeverityInfo("invalid");
    const fallbackEmpty = getSeverityInfo("");

    expect(fallbackInvalid.label).toBe(severityConfig.minor.label);
    expect(fallbackEmpty.label).toBe(severityConfig.minor.label);
    expect(fallbackInvalid.variant).toBe("outline");
    expect(fallbackEmpty.variant).toBe("outline");
  });

  it("returns correct badge variant for each severity", () => {
    expect(getSeverityInfo("critical").variant).toBe("destructive");
    expect(getSeverityInfo("moderate").variant).toBe("warning");
    expect(getSeverityInfo("minor").variant).toBe("warningMinor");
  });
});

describe("getConfidenceInfo", () => {
  it("returns correct info for valid confidence levels", () => {
    expect(getConfidenceInfo("high")).toEqual(confidenceConfig.high);
    expect(getConfidenceInfo("medium")).toEqual(confidenceConfig.medium);
    expect(getConfidenceInfo("low")).toEqual(confidenceConfig.low);
  });

  it("returns low config as fallback for invalid confidence", () => {
    expect(getConfidenceInfo("invalid")).toEqual(confidenceConfig.low);
    expect(getConfidenceInfo("")).toEqual(confidenceConfig.low);
  });

  it("returns correct badge variant for each confidence level", () => {
    expect(getConfidenceInfo("high").variant).toBe("success");
    expect(getConfidenceInfo("medium").variant).toBe("warningMinor");
    expect(getConfidenceInfo("low").variant).toBe("outline");
  });
});

describe("parseRegressionCauses", () => {
  it("parses valid array of regression causes", () => {
    const mockCauses: RegressionCause[] = [
      {
        id: "1",
        title: "Increased JavaScript bundle size",
        description: "Main bundle increased by 150KB",
        confidence: 0.9,
        estimatedImpact: 0.8,
        evidence: [
          {
            type: "metric",
            label: "Bundle size",
            before: 500,
            after: 650,
            delta: 150,
          },
        ],
        recommendations: ["Consider code splitting"],
      },
    ];

    const result = parseRegressionCauses(mockCauses);
    expect(result).toEqual(mockCauses);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for null", () => {
    expect(parseRegressionCauses(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(parseRegressionCauses(undefined)).toEqual([]);
  });

  it("returns empty array for non-array values", () => {
    expect(parseRegressionCauses({})).toEqual([]);
    expect(parseRegressionCauses("string")).toEqual([]);
    expect(parseRegressionCauses(123)).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(parseRegressionCauses([])).toEqual([]);
  });
});

describe("parseDiffSummary", () => {
  it("parses valid diff summary object", () => {
    const mockDiff: DiffSummary = {
      network: {
        totalBytesDelta: 150000,
        requestCountDelta: 5,
        imageBytesDelta: 50000,
        jsBytesDelta: 100000,
        cssBytesDelta: 0,
        fontBytesDelta: 0,
        thirdPartyBytesDelta: 75000,
        newDomains: ["cdn.example.com"],
        removedDomains: [],
      },
      mainThread: {
        scriptingTimeDelta: 250,
        renderingTimeDelta: 100,
        longTaskCountDelta: 2,
        totalMainThreadTimeDelta: 350,
      },
      rendering: {
        lcpResourceChanged: true,
        lcpResourceBefore: "/old-hero.jpg",
        lcpResourceAfter: "/new-hero.jpg",
        clsShiftSourcesChanged: false,
      },
      backend: {
        ttfbDelta: 150,
        serverLatencyDelta: 120,
      },
    };

    const result = parseDiffSummary(mockDiff);
    expect(result).toEqual(mockDiff);
  });

  it("returns null for null input", () => {
    expect(parseDiffSummary(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseDiffSummary(undefined)).toBeNull();
  });

  it("returns null for non-object values", () => {
    expect(parseDiffSummary("string")).toBeNull();
    expect(parseDiffSummary(123)).toBeNull();
    expect(parseDiffSummary(true)).toBeNull();
  });

  it("returns null for array values", () => {
    expect(parseDiffSummary([])).toBeNull();
    expect(parseDiffSummary([1, 2, 3])).toBeNull();
  });
});
