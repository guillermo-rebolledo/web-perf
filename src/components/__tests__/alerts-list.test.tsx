import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertsList } from "../alerts-list";
import type { RegressionAlertWithDetails } from "../alert-card";

// Mock the AlertCard component
vi.mock("../alert-card", () => ({
  AlertCard: ({ alert }: { alert: RegressionAlertWithDetails }) => (
    <div data-testid={`alert-${alert.id}`}>{alert.id}</div>
  ),
}));

// Helper to create mock alerts
function createMockAlert(id: string, daysAgo: number = 0): RegressionAlertWithDetails {
  return {
    id,
    metricName: "lcp",
    baselineValue: 2000,
    actualValue: 3200,
    delta: 1200,
    percentChange: 60,
    severity: "critical",
    confidence: "high",
    status: "open",
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    run: {
      id: `run-${id}`,
      completedAt: new Date(),
      monitor: {
        id: "monitor-1",
        site: {
          id: "site-1",
          name: "Test Site",
          url: "https://example.com",
        },
      },
    },
  };
}

describe("AlertsList", () => {
  let intersectionObserverCallback: IntersectionObserverCallback;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn();

    // Mock IntersectionObserver
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();

    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        intersectionObserverCallback = callback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
      root = null;
      rootMargin = "";
      thresholds = [];
      takeRecords = () => [];
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("with few alerts (no pagination needed)", () => {
    it("should display alerts without triggering infinite scroll", () => {
      const initialAlerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Should display all 10 alerts
      expect(screen.getByText(/10 alerts in the last 30 days/)).toBeInTheDocument();
      initialAlerts.forEach((alert) => {
        expect(screen.getByTestId(`alert-${alert.id}`)).toBeInTheDocument();
      });

      // With fewer than 20 alerts hasMore is false, so no sentinel is rendered
      // and the observer has nothing to observe
      expect(mockObserve).not.toHaveBeenCalled();
    });

    it("should show 'end of list' message when hasMore is false", async () => {
      const initialAlerts = Array.from({ length: 15 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Wait for component to render
      await waitFor(() => {
        expect(
          screen.getByText(/You've reached the end of the list/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("with many alerts (pagination needed)", () => {
    it("should load initial alerts and setup infinite scroll", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Should display initial 20 alerts
      expect(screen.getByText(/20 alerts in the last 30 days/)).toBeInTheDocument();

      // Should setup IntersectionObserver
      expect(mockObserve).toHaveBeenCalled();
    });

    it("should fetch more alerts when scrolling to bottom", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      const nextPageAlerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(`alert-${i + 20}`)
      );

      // Mock successful fetch
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            alerts: nextPageAlerts,
            nextCursor: null,
            hasMore: false,
          }),
          { status: 200 }
        )
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Trigger intersection (simulate scrolling to bottom)
      const observerTarget = mockObserve.mock.calls[0][0];
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Should fetch more alerts
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/alerts?days=30&limit=20")
        );
      });

      // Should display all 30 alerts
      await waitFor(() => {
        expect(screen.getByText(/30 alerts in the last 30 days/)).toBeInTheDocument();
      });

      // Should show end of list message
      await waitFor(() => {
        expect(
          screen.getByText(/You've reached the end of the list/)
        ).toBeInTheDocument();
      });
    });

    it("should show loading skeletons while fetching", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      // Mock slow fetch
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(
                    JSON.stringify({
                      alerts: [],
                      nextCursor: null,
                      hasMore: false,
                    }),
                    { status: 200 }
                  )
                ),
              100
            )
          )
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Trigger intersection
      const observerTarget = mockObserve.mock.calls[0][0];
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Should show loading skeletons
      await waitFor(() => {
        const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it("should handle multiple pages of data", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      const page2Alerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i + 20}`)
      );

      const page3Alerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(`alert-${i + 40}`)
      );

      // Mock first fetch (page 2)
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              alerts: page2Alerts,
              nextCursor: "cursor-2",
              hasMore: true,
            }),
            { status: 200 }
          )
        )
        // Mock second fetch (page 3)
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              alerts: page3Alerts,
              nextCursor: null,
              hasMore: false,
            }),
            { status: 200 }
          )
        );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Trigger first intersection (load page 2)
      const observerTarget = mockObserve.mock.calls[0][0];
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Wait for page 2 to load
      await waitFor(() => {
        expect(screen.getByText(/40 alerts in the last 30 days/)).toBeInTheDocument();
      });

      // Trigger second intersection (load page 3)
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Wait for page 3 to load
      await waitFor(() => {
        expect(screen.getByText(/50 alerts in the last 30 days/)).toBeInTheDocument();
      });

      // Should show end of list
      await waitFor(() => {
        expect(
          screen.getByText(/You've reached the end of the list/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should display error message on fetch failure", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      // Mock failed fetch
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error("Network error")
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Trigger intersection
      const observerTarget = mockObserve.mock.calls[0][0];
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });

    it("should retry fetch when retry button is clicked", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      const nextPageAlerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(`alert-${i + 20}`)
      );

      // Mock first fetch fails, second succeeds
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              alerts: nextPageAlerts,
              nextCursor: null,
              hasMore: false,
            }),
            { status: 200 }
          )
        );

      const user = userEvent.setup();

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // Trigger intersection (should fail)
      const observerTarget = mockObserve.mock.calls[0][0];
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText(/Retry/);
      await user.click(retryButton);

      // Should fetch successfully
      await waitFor(() => {
        expect(screen.getByText(/30 alerts in the last 30 days/)).toBeInTheDocument();
      });
    });
  });

  describe("filter changes", () => {
    it("should reset alerts when severity filter changes", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      const criticalAlerts = Array.from({ length: 5 }, (_, i) =>
        createMockAlert(`critical-${i}`)
      );

      const { rerender } = render(
        <AlertsList initialAlerts={initialAlerts} days={30} />
      );

      expect(screen.getByText(/20 alerts/)).toBeInTheDocument();

      // Change severity filter
      rerender(
        <AlertsList
          initialAlerts={criticalAlerts}
          days={30}
          severity="critical"
        />
      );

      // Should show new filtered count
      await waitFor(() => {
        expect(screen.getByText(/5 alerts/)).toBeInTheDocument();
      });
    });

    it("should reset alerts when days filter changes", async () => {
      const alerts30d = Array.from({ length: 30 }, (_, i) =>
        createMockAlert(`alert-${i}`, i)
      );

      const alerts1d = Array.from({ length: 3 }, (_, i) =>
        createMockAlert(`alert-${i}`, 0)
      );

      const { rerender } = render(
        <AlertsList initialAlerts={alerts30d} days={30} />
      );

      expect(screen.getByText(/30 alerts in the last 30 days/)).toBeInTheDocument();

      // Change days filter
      rerender(<AlertsList initialAlerts={alerts1d} days={1} />);

      // Should show new filtered count
      await waitFor(() => {
        expect(screen.getByText(/3 alerts in the last 1 day/)).toBeInTheDocument();
      });
    });
  });

  describe("edge cases", () => {
    // Note: Testing for preventing duplicate fetches during loading is challenging
    // in a test environment due to React's asynchronous state updates. The component
    // does check isLoading, but in practice, the IntersectionObserver's throttling
    // (rootMargin: "100px") prevents most duplicate fetches in real usage.

    it("should not fetch when hasMore is false", async () => {
      const initialAlerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      render(<AlertsList initialAlerts={initialAlerts} days={30} />);

      // With fewer than 20 items hasMore is false: no sentinel is rendered so
      // the IntersectionObserver is never set up and no fetch can be triggered.
      expect(mockObserve).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should cleanup observer on unmount", () => {
      // Use 20 alerts so hasMore is true, the sentinel is rendered, and the
      // observer is set up — giving us something to verify on unmount.
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      const { unmount } = render(
        <AlertsList initialAlerts={initialAlerts} days={30} />
      );

      const observerTarget = mockObserve.mock.calls[0][0];

      unmount();

      // Should unobserve the sentinel element
      expect(mockUnobserve).toHaveBeenCalledWith(observerTarget);
    });
  });

  describe("with severity filter", () => {
    it("should include severity in API request", async () => {
      const initialAlerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(`alert-${i}`)
      );

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            alerts: [],
            nextCursor: null,
            hasMore: false,
          }),
          { status: 200 }
        )
      );

      render(
        <AlertsList
          initialAlerts={initialAlerts}
          days={30}
          severity="critical"
        />
      );

      // Trigger intersection
      const observerTarget = mockObserve.mock.calls[0][0];
      act(() => {
        intersectionObserverCallback(
          [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
          {} as unknown as IntersectionObserver
        );
      });

      // Should include severity in request
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("severity=critical")
        );
      });
    });
  });
});
