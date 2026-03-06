import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import "@/__tests__/helpers/prisma-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";

vi.mock("@/lib/digest/unsubscribe-token", () => ({
  verifyUnsubscribeToken: vi.fn(),
}));

import { GET } from "../route";
import { verifyUnsubscribeToken } from "@/lib/digest/unsubscribe-token";

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost:3000/api/digest/unsubscribe?token=${token}`
    : "http://localhost:3000/api/digest/unsubscribe";
  return new NextRequest(new URL(url), { method: "GET" });
}

describe("GET /api/digest/unsubscribe", () => {
  beforeEach(() => {
    vi.mocked(verifyUnsubscribeToken).mockReset();
  });

  it("returns 400 when token query param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when token is invalid or tampered", async () => {
    vi.mocked(verifyUnsubscribeToken).mockReturnValue(null);
    const res = await GET(makeRequest("bad-token"));
    expect(res.status).toBe(400);
  });

  it("sets weeklyDigestEnabled to false for the resolved user", async () => {
    vi.mocked(verifyUnsubscribeToken).mockReturnValue("user-123");
    prismaMock.user.update.mockResolvedValue({} as never);

    await GET(makeRequest("valid-token"));

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { weeklyDigestEnabled: false },
    });
  });

  it("redirects to /settings?unsubscribed=1 on success", async () => {
    vi.mocked(verifyUnsubscribeToken).mockReturnValue("user-123");
    prismaMock.user.update.mockResolvedValue({} as never);

    const res = await GET(makeRequest("valid-token"));

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/settings");
    expect(location).toContain("unsubscribed=1");
  });
});
