import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  mockAuthenticated,
  mockUnauthenticated,
} from "@/__tests__/helpers/auth-mock";
import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import { PATCH } from "../route";

function makeRequest(body?: unknown) {
  const init: RequestInit = { method: "PATCH" };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL("http://localhost:3000/api/user"), {
    ...init,
    signal: undefined,
  });
}

describe("PATCH /api/user", () => {
  beforeEach(() => mockAuthenticated());

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();
    const res = await PATCH(makeRequest({ weeklyDigestEnabled: false }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing body", async () => {
    const res = await PATCH(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when weeklyDigestEnabled is not a boolean", async () => {
    const res = await PATCH(makeRequest({ weeklyDigestEnabled: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required field is missing", async () => {
    const res = await PATCH(makeRequest({ someOtherField: true }));
    expect(res.status).toBe(400);
  });

  it("updates and returns the user on valid PATCH (disable digest)", async () => {
    prismaMock.user.update.mockResolvedValue({
      id: "test-user-id",
      email: "test@example.com",
      weeklyDigestEnabled: false,
    } as never);

    const res = await PATCH(makeRequest({ weeklyDigestEnabled: false }));
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      weeklyDigestEnabled: boolean;
      email: string;
    };
    expect(data.weeklyDigestEnabled).toBe(false);
    expect(data.email).toBe("test@example.com");

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "test-user-id" },
        data: { weeklyDigestEnabled: false },
      })
    );
  });

  it("updates and returns the user on valid PATCH (enable digest)", async () => {
    prismaMock.user.update.mockResolvedValue({
      id: "test-user-id",
      email: "test@example.com",
      weeklyDigestEnabled: true,
    } as never);

    const res = await PATCH(makeRequest({ weeklyDigestEnabled: true }));
    expect(res.status).toBe(200);

    const data = (await res.json()) as { weeklyDigestEnabled: boolean };
    expect(data.weeklyDigestEnabled).toBe(true);
  });
});
