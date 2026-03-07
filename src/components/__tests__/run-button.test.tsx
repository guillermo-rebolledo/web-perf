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

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { toast } from "sonner";

describe("RunButton", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.info).mockReset();
    vi.mocked(toast.warning).mockReset();
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

  it("fires toast.error on 429", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: "Rate limit exceeded", remaining: 0 }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Daily run limit reached",
        expect.objectContaining({
          description: expect.stringContaining("midnight"),
        })
      );
    });
  });

  it("fires toast.info on 409", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({ error: "Monitor already has a run in progress" }),
    });

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        "Audit already in progress",
        expect.objectContaining({
          description: expect.stringContaining("queued"),
        })
      );
    });
  });

  it("fires toast.error on generic fetch failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<RunButton monitorId="m1" />);
    await user.click(screen.getByRole("button", { name: /run now/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to start run",
        expect.objectContaining({ description: "Network error" })
      );
    });
  });
});
