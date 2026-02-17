import { vi } from "vitest";

export const defaultSession = {
  user: {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const authMock = vi.fn().mockResolvedValue(defaultSession);

vi.mock("@/lib/auth", () => ({
  auth: authMock,
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

export function mockAuthenticated(
  session: typeof defaultSession | null = defaultSession
) {
  authMock.mockResolvedValue(session);
}

export function mockUnauthenticated() {
  authMock.mockResolvedValue(null);
}

export { authMock };
