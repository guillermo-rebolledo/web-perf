import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ScheduledQuotaWarning } from "@/components/scheduled-quota-warning";

vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeQuotaResponse(scheduledSuccess: boolean, limit = 500) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        manual: { success: true, remaining: 100, limit: 100 },
        scheduled: {
          success: scheduledSuccess,
          remaining: scheduledSuccess ? limit : 0,
          limit,
        },
      }),
  };
}

describe("ScheduledQuotaWarning", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.warning).mockReset();
  });

  it("does not fire toast.warning when quota is not exhausted", async () => {
    mockFetch.mockResolvedValue(makeQuotaResponse(true));

    render(<ScheduledQuotaWarning />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/quota");
    });
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("fires toast.warning when scheduled quota is exhausted", async () => {
    mockFetch.mockResolvedValue(makeQuotaResponse(false, 500));

    render(<ScheduledQuotaWarning />);

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        "Scheduled monitoring paused for today",
        expect.objectContaining({
          description: expect.stringContaining("500"),
        })
      );
    });
    expect(toast.warning).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        description: expect.stringContaining("midnight"),
      })
    );
  });

  it("does not fire any toast on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<ScheduledQuotaWarning />);

    // Give effects time to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(toast.warning).not.toHaveBeenCalled();
  });
});
