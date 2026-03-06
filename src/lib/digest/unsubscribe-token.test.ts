import { describe, it, expect, vi } from "vitest";

vi.mock("@/env", () => ({
  env: {
    NEXTAUTH_SECRET: "test-secret-for-hmac",
  },
}));

import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

describe("generateUnsubscribeToken", () => {
  it("returns a non-empty base64url string", () => {
    const token = generateUnsubscribeToken("user-123");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    // base64url chars only
    expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("produces different tokens for different user IDs", () => {
    const t1 = generateUnsubscribeToken("user-1");
    const t2 = generateUnsubscribeToken("user-2");
    expect(t1).not.toBe(t2);
  });
});

describe("verifyUnsubscribeToken", () => {
  it("returns the userId for a valid token", () => {
    const userId = "user-abc";
    const token = generateUnsubscribeToken(userId);
    expect(verifyUnsubscribeToken(token)).toBe(userId);
  });

  it("returns null when the signature is tampered", () => {
    const token = generateUnsubscribeToken("user-xyz");
    // Flip the last few characters to tamper the HMAC
    const tampered = token.slice(0, -4) + "AAAA";
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("returns null for a completely invalid string", () => {
    expect(verifyUnsubscribeToken("not-a-real-token")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(verifyUnsubscribeToken("")).toBeNull();
  });

  it("returns null for a base64url string with no colon after decode", () => {
    const noColon = Buffer.from("nocolon").toString("base64url");
    expect(verifyUnsubscribeToken(noColon)).toBeNull();
  });

  it("is deterministic — same input always verifies", () => {
    const token = generateUnsubscribeToken("user-stable");
    expect(verifyUnsubscribeToken(token)).toBe("user-stable");
    expect(verifyUnsubscribeToken(token)).toBe("user-stable");
  });
});
