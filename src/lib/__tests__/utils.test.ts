import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

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
