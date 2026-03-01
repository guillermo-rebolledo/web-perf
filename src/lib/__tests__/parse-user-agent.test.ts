import { describe, it, expect } from "vitest";
import { parseUserAgent } from "@/lib/parse-user-agent";

describe("parseUserAgent", () => {
  describe("browser detection", () => {
    it("detects Chrome", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(ua)).toBe("Chrome on Windows");
    });

    it("detects Edge (before Chrome due to Edg/ token)", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      expect(parseUserAgent(ua)).toBe("Edge on Windows");
    });

    it("detects Firefox", () => {
      const ua =
        "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
      expect(parseUserAgent(ua)).toBe("Firefox on Linux");
    });

    it("detects Safari (no Chrome token)", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
      expect(parseUserAgent(ua)).toBe("Safari on macOS");
    });

    it("returns 'Unknown browser' for unrecognised browser strings", () => {
      const ua = "curl/7.88.1";
      expect(parseUserAgent(ua)).toMatch(/^Unknown browser/);
    });
  });

  describe("OS detection", () => {
    it("detects Windows", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(ua)).toContain("Windows");
    });

    it("detects macOS", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(ua)).toContain("macOS");
    });

    it("detects iOS", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      expect(parseUserAgent(ua)).toContain("iOS");
    });

    it("detects Android", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
      expect(parseUserAgent(ua)).toContain("Android");
    });

    it("detects Linux", () => {
      const ua =
        "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0";
      expect(parseUserAgent(ua)).toContain("Linux");
    });

    it("returns 'Unknown OS' for unrecognised OS strings", () => {
      const ua = "SomeBot/1.0";
      expect(parseUserAgent(ua)).toMatch(/Unknown OS$/);
    });
  });

  describe("combined output format", () => {
    it("returns '{browser} on {os}' format", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(ua)).toBe("Chrome on macOS");
    });

    it("handles completely empty string", () => {
      expect(parseUserAgent("")).toBe("Unknown browser on Unknown OS");
    });
  });
});
