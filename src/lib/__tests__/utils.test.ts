import { describe, it, expect } from "vitest";
import { cn, formatBytes } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts with last-wins", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("returns empty string when given no arguments", () => {
    expect(cn()).toBe("");
  });
});

describe("formatBytes", () => {
  it("formats values under 1 KB as bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats values in the KB range", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(94000)).toBe("91.8 KB");
  });

  it("formats values in the MB range", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(2500000)).toBe("2.4 MB");
  });
});
