import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunButton } from "@/components/run-button";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RunButton", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders Run Now button", () => {
    render(<RunButton monitorId="m1" />);
    expect(screen.getByRole("button", { name: /run now/i })).toBeInTheDocument();
  });

  it("shows loading state when clicked", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ runId: "r1", jobId: "j1", remaining: 99 }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    await expect(
      screen.findByRole("button", { name: /running/i })
    ).resolves.toBeInTheDocument();
  });

  it("calls POST /api/monitors/:id/run", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ runId: "r1", jobId: "j1", remaining: 99 }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    expect(mockFetch).toHaveBeenCalledWith("/api/monitors/m1/run", {
      method: "POST",
    });
  });

  it("displays remaining runs in tooltip after success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ runId: "r1", jobId: "j1", remaining: 42 }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    // Wait for fetch to resolve and state to update, then open tooltip and assert
    const runsRemainingTrigger = screen.getByRole("generic", { name: /runs remaining/i });
    await waitFor(async () => {
      await user.hover(runsRemainingTrigger);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/42 manual runs remaining today/i);
    });
  });

  it("shows rate limit error on 429", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: "Rate limit exceeded", remaining: 0 }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    await expect(screen.findByText(/rate limit exceeded/i)).resolves.toBeInTheDocument();
  });

  it("shows conflict error on 409", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({ error: "Monitor already has a run in progress" }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    await expect(screen.findByText(/already in progress/i)).resolves.toBeInTheDocument();
  });
});
