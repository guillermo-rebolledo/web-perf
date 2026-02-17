import { describe, it, expect } from "vitest";
import { canonicalizeUrl, validateUrl, extractDomain } from "@/lib/url-utils";

describe("canonicalizeUrl", () => {
  it("upgrades http to https for non-localhost URLs", () => {
    expect(canonicalizeUrl("http://example.com")).toBe("https://example.com/");
  });

  it("keeps http for localhost", () => {
    expect(canonicalizeUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/"
    );
  });

  it("strips www. prefix", () => {
    expect(canonicalizeUrl("https://www.example.com")).toBe(
      "https://example.com/"
    );
  });

  it("removes trailing slash from paths (but not root)", () => {
    expect(canonicalizeUrl("https://example.com/about/")).toBe(
      "https://example.com/about"
    );
  });

  it("preserves root trailing slash", () => {
    const result = canonicalizeUrl("https://example.com/");
    expect(result).toBe("https://example.com/");
  });

  it("sorts query parameters alphabetically", () => {
    const result = canonicalizeUrl("https://example.com?z=1&a=2");
    expect(result).toBe("https://example.com/?a=2&z=1");
  });

  it("throws on invalid URL", () => {
    expect(() => canonicalizeUrl("not-a-url")).toThrow();
  });

  it("combines all normalizations", () => {
    const result = canonicalizeUrl("http://www.example.com/path/?b=2&a=1");
    expect(result).toBe("https://example.com/path?a=1&b=2");
  });
});

describe("validateUrl", () => {
  it("returns true for valid URLs", () => {
    expect(validateUrl("https://example.com")).toBe(true);
    expect(validateUrl("http://localhost:3000")).toBe(true);
  });

  it("returns false for invalid URLs", () => {
    expect(validateUrl("not-a-url")).toBe(false);
    expect(validateUrl("")).toBe(false);
  });
});

describe("extractDomain", () => {
  it("extracts the hostname from a URL", () => {
    expect(extractDomain("https://example.com/path")).toBe("example.com");
    expect(extractDomain("https://sub.example.com")).toBe("sub.example.com");
  });

  it("returns empty string for invalid URLs", () => {
    expect(extractDomain("not-a-url")).toBe("");
  });
});
