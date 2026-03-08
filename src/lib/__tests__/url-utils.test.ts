import { describe, it, expect } from "vitest";
import { canonicalizeUrl, isPublicUrl, validateUrl, extractDomain, extractFilename } from "@/lib/url-utils";

describe("isPublicUrl", () => {
  it("accepts public https URLs", () => {
    expect(isPublicUrl("https://example.com")).toBe(true);
    expect(isPublicUrl("https://my-app.vercel.app/path")).toBe(true);
  });

  it("accepts public http URLs", () => {
    expect(isPublicUrl("http://example.com")).toBe(true);
  });

  it("rejects localhost", () => {
    expect(isPublicUrl("http://localhost")).toBe(false);
    expect(isPublicUrl("http://localhost:3000")).toBe(false);
  });

  it("rejects loopback 127.x.x.x", () => {
    expect(isPublicUrl("http://127.0.0.1")).toBe(false);
    expect(isPublicUrl("http://127.1.2.3")).toBe(false);
  });

  it("rejects private 10.x.x.x range", () => {
    expect(isPublicUrl("http://10.0.0.1")).toBe(false);
    expect(isPublicUrl("https://10.255.255.255")).toBe(false);
  });

  it("rejects private 192.168.x.x range", () => {
    expect(isPublicUrl("http://192.168.1.1")).toBe(false);
  });

  it("rejects private 172.16-31.x.x range", () => {
    expect(isPublicUrl("http://172.16.0.1")).toBe(false);
    expect(isPublicUrl("http://172.31.255.255")).toBe(false);
    expect(isPublicUrl("http://172.15.0.1")).toBe(true); // just outside range
  });

  it("rejects link-local 169.254.x.x (AWS/cloud metadata)", () => {
    expect(isPublicUrl("http://169.254.169.254")).toBe(false);
  });

  it("rejects IPv6 loopback", () => {
    expect(isPublicUrl("http://[::1]")).toBe(false);
  });

  it("rejects GCP metadata hostname", () => {
    expect(isPublicUrl("http://metadata.google.internal")).toBe(false);
  });

  it("rejects non-http schemes", () => {
    expect(isPublicUrl("ftp://example.com")).toBe(false);
    expect(isPublicUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isPublicUrl("not-a-url")).toBe(false);
    expect(isPublicUrl("")).toBe(false);
  });
});

describe("canonicalizeUrl", () => {
  it("upgrades http to https", () => {
    expect(canonicalizeUrl("http://example.com")).toBe("https://example.com/");
  });

  it("rejects localhost", () => {
    expect(() => canonicalizeUrl("http://localhost:3000")).toThrow();
  });

  it("rejects private IP ranges", () => {
    expect(() => canonicalizeUrl("http://192.168.1.1")).toThrow();
    expect(() => canonicalizeUrl("http://10.0.0.1")).toThrow();
    expect(() => canonicalizeUrl("http://169.254.169.254")).toThrow();
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

describe("extractFilename", () => {
  it("extracts the filename from a URL path", () => {
    expect(extractFilename("https://example.com/assets/hero.png")).toBe("hero.png");
  });

  it("handles URLs with query strings", () => {
    expect(extractFilename("https://cdn.example.com/app.js?v=123")).toBe("app.js");
  });

  it("returns the pathname for root URLs", () => {
    expect(extractFilename("https://example.com/")).toBe("/");
  });

  it("returns the raw string for invalid URLs", () => {
    expect(extractFilename("not-a-url")).toBe("not-a-url");
  });

  it("handles deeply nested paths", () => {
    expect(extractFilename("https://cdn.example.com/a/b/c/styles.css")).toBe("styles.css");
  });
});
