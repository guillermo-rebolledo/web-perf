import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatMs,
  formatCls,
  formatCadence,
  formatRelative,
  scoreColor,
  severityColor,
} from "./format.js";

describe("formatMs", () => {
  it("formats milliseconds with locale separators", () => {
    expect(formatMs(1234)).toBe("1,234 ms");
  });

  it("rounds to nearest integer", () => {
    expect(formatMs(1234.7)).toBe("1,235 ms");
  });

  it("returns dash for null", () => {
    expect(formatMs(null)).toBe("–");
  });
});

describe("formatCls", () => {
  it("formats to 3 decimal places", () => {
    expect(formatCls(0.042)).toBe("0.042");
  });

  it("pads to 3 decimal places", () => {
    expect(formatCls(0.1)).toBe("0.100");
  });

  it("returns dash for null", () => {
    expect(formatCls(null)).toBe("–");
  });
});

describe("formatCadence", () => {
  it("formats whole days", () => {
    expect(formatCadence(1440)).toBe("every 1d");
    expect(formatCadence(2880)).toBe("every 2d");
  });

  it("formats whole hours", () => {
    expect(formatCadence(60)).toBe("every 1h");
    expect(formatCadence(720)).toBe("every 12h");
  });

  it("formats remaining minutes", () => {
    expect(formatCadence(30)).toBe("every 30min");
    expect(formatCadence(90)).toBe("every 90min");
  });
});

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  it("returns overdue for past dates", () => {
    expect(formatRelative("2024-01-01T11:00:00Z")).toBe("overdue");
  });

  it("formats minutes", () => {
    expect(formatRelative("2024-01-01T12:45:00Z")).toBe("in 45m");
  });

  it("formats hours", () => {
    expect(formatRelative("2024-01-01T14:00:00Z")).toBe("in 2h");
  });

  it("formats days", () => {
    expect(formatRelative("2024-01-03T12:00:00Z")).toBe("in 2d");
  });
});

describe("scoreColor", () => {
  it("returns green for scores >= 90", () => {
    expect(scoreColor(90)).toBe("green");
    expect(scoreColor(100)).toBe("green");
  });

  it("returns yellow for scores 50–89", () => {
    expect(scoreColor(50)).toBe("yellow");
    expect(scoreColor(89)).toBe("yellow");
  });

  it("returns red for scores below 50", () => {
    expect(scoreColor(0)).toBe("red");
    expect(scoreColor(49)).toBe("red");
  });

  it("returns gray for null", () => {
    expect(scoreColor(null)).toBe("gray");
  });
});

describe("severityColor", () => {
  it("maps severities to colors", () => {
    expect(severityColor("critical")).toBe("red");
    expect(severityColor("moderate")).toBe("yellow");
    expect(severityColor("minor")).toBe("gray");
  });
});
