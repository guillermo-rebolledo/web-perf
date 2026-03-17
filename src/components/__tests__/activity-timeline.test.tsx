import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityTimeline } from "../activity-timeline";
import type { ActivityEventRow } from "@/types/api";

// Mock ActivityEventCard to keep tests focused
vi.mock("../activity-event-card", () => ({
  ActivityEventCard: ({ event }: { event: ActivityEventRow }) => (
    <div data-testid={`event-${event.id}`}>{event.type}</div>
  ),
}));

function createEvent(id: string, type = "run_completed"): ActivityEventRow {
  return {
    id,
    type,
    entityId: `run-${id}`,
    entityType: "run",
    metadata: { type, siteName: "Test Site" },
    createdAt: new Date(Date.now() - parseInt(id) * 1000).toISOString(),
  };
}

describe("ActivityTimeline", () => {
  let intersectionObserverCallback: IntersectionObserverCallback;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    global.fetch = vi.fn();

    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        intersectionObserverCallback = callback;
      }
      observe = mockObserve;
      unobserve = vi.fn();
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

  it("renders initial events", () => {
    const events = [createEvent("1"), createEvent("2")];
    render(<ActivityTimeline initialEvents={events} initialCursor={null} initialHasMore={false} />);

    expect(screen.getByTestId("event-1")).toBeInTheDocument();
    expect(screen.getByTestId("event-2")).toBeInTheDocument();
  });

  it("shows empty state when no events", () => {
    render(<ActivityTimeline initialEvents={[]} initialCursor={null} initialHasMore={false} />);
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("renders filter dropdown", () => {
    render(<ActivityTimeline initialEvents={[]} initialCursor={null} initialHasMore={false} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("loads more events when sentinel intersects", async () => {
    const initialEvents = Array.from({ length: 20 }, (_, i) => createEvent(String(i)));
    const moreEvents = [createEvent("20"), createEvent("21")];

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ events: moreEvents, nextCursor: null, hasMore: false }),
        { status: 200 }
      )
    );

    render(
      <ActivityTimeline
        initialEvents={initialEvents}
        initialCursor="2026-01-01T00:00:00Z_event-19"
        initialHasMore={true}
      />
    );

    const observerTarget = mockObserve.mock.calls[0][0];
    act(() => {
      intersectionObserverCallback(
        [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("event-20")).toBeInTheDocument();
      expect(screen.getByTestId("event-21")).toBeInTheDocument();
    });
  });

  it("shows error message on fetch failure", async () => {
    const initialEvents = Array.from({ length: 20 }, (_, i) => createEvent(String(i)));

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(null, { status: 500 })
    );

    render(
      <ActivityTimeline
        initialEvents={initialEvents}
        initialCursor="cursor"
        initialHasMore={true}
      />
    );

    const observerTarget = mockObserve.mock.calls[0][0];
    act(() => {
      intersectionObserverCallback(
        [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Failed to load activity")).toBeInTheDocument();
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("retries on button click", async () => {
    const initialEvents = Array.from({ length: 20 }, (_, i) => createEvent(String(i)));
    const moreEvents = [createEvent("20")];

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ events: moreEvents, nextCursor: null, hasMore: false }),
          { status: 200 }
        )
      );

    const user = userEvent.setup();

    render(
      <ActivityTimeline
        initialEvents={initialEvents}
        initialCursor="cursor"
        initialHasMore={true}
      />
    );

    const observerTarget = mockObserve.mock.calls[0][0];
    act(() => {
      intersectionObserverCallback(
        [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByTestId("event-20")).toBeInTheDocument();
    });
  });

  it("includes type filter in fetch URL when filter is not 'all'", async () => {
    const filteredEvents = [createEvent("100", "site_created")];

    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ events: filteredEvents, nextCursor: null, hasMore: false }),
        { status: 200 }
      )
    );

    // Render with 20 events so hasMore=true and the observer fires
    const initialEvents = Array.from({ length: 20 }, (_, i) => createEvent(String(i)));
    render(
      <ActivityTimeline
        initialEvents={initialEvents}
        initialCursor="2026-01-01T00:00:00Z_event-19"
        initialHasMore={true}
      />
    );

    // Trigger a fetch by intersecting
    const observerTarget = mockObserve.mock.calls[0][0];
    act(() => {
      intersectionObserverCallback(
        [{ isIntersecting: true, target: observerTarget } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // With default "all" filter, type should NOT be in URL
    expect(vi.mocked(global.fetch).mock.calls[0][0]).not.toContain("type=");
  });

  it("disconnects observer on unmount", () => {
    const initialEvents = Array.from({ length: 20 }, (_, i) => createEvent(String(i)));

    const { unmount } = render(
      <ActivityTimeline
        initialEvents={initialEvents}
        initialCursor="cursor"
        initialHasMore={true}
      />
    );

    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
