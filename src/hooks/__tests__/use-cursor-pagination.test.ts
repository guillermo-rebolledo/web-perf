import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCursorPagination, type UseCursorPaginationResult } from "../use-cursor-pagination";

interface Item {
  id: string;
}

type PaginationProps = {
  items: Item[];
  cursor: string | null;
};

function makeItems(count: number, offset = 0): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: `item-${i + offset}` }));
}

describe("useCursorPagination", () => {
  let intersectionObserverCallback: IntersectionObserverCallback;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();

    global.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        intersectionObserverCallback = callback;
      }
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = vi.fn();
      root = null;
      rootMargin = "";
      thresholds = [];
      takeRecords = () => [];
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Initial state ────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("exposes the initial items", () => {
      const initialItems = makeItems(5);
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: null, fetcher: vi.fn() })
      );
      expect(result.current.items).toEqual(initialItems);
    });

    it("hasMore is false when initialCursor is null", () => {
      const initialItems = makeItems(5);
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: null, fetcher: vi.fn() })
      );
      expect(result.current.hasMore).toBe(false);
    });

    it("hasMore is true when initialCursor is provided", () => {
      const initialItems = makeItems(20);
      const { result } = renderHook(() =>
        useCursorPagination({
          initialItems,
          initialCursor: "critical_2024-01-01T00:00:00.000Z_abc123",
          fetcher: vi.fn(),
        })
      );
      expect(result.current.hasMore).toBe(true);
    });

    it("starts with isLoading=false and error=null", () => {
      const initialItems = makeItems(0);
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: null, fetcher: vi.fn() })
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ─── loadMore ─────────────────────────────────────────────────────────────

  describe("loadMore", () => {
    it("calls the fetcher with the current cursor", async () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });

      expect(fetcher).toHaveBeenCalledWith("cursor-1");
    });

    it("appends fetched items to the existing list", async () => {
      const initialItems = makeItems(20);
      const nextItems = makeItems(10, 20);
      const fetcher = vi.fn().mockResolvedValue({
        items: nextItems,
        nextCursor: "cursor-2",
        hasMore: true,
      });
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });

      expect(result.current.items).toEqual([...initialItems, ...nextItems]);
    });

    it("advances the cursor and uses it on the next loadMore", async () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ items: makeItems(20, 20), nextCursor: "cursor-2", hasMore: true })
        .mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false });
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });

      await act(async () => {
        result.current.loadMore();
      });

      expect(fetcher).toHaveBeenNthCalledWith(1, "cursor-1");
      expect(fetcher).toHaveBeenNthCalledWith(2, "cursor-2");
    });

    it("sets hasMore=false when the last page is reached", async () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn().mockResolvedValue({
        items: makeItems(5, 20),
        nextCursor: null,
        hasMore: false,
      });
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });

      expect(result.current.hasMore).toBe(false);
    });

    it("sets error on fetch failure", async () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn().mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.isLoading).toBe(false);
    });

    it("clears the error on the next successful fetch", async () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ items: makeItems(5, 20), nextCursor: null, hasMore: false });
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });
      expect(result.current.error).toBe("Network error");

      await act(async () => {
        result.current.loadMore();
      });
      expect(result.current.error).toBeNull();
    });

    it("does not fetch when hasMore is false", async () => {
      const initialItems = makeItems(5);
      const fetcher = vi.fn();
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: null, fetcher })
      );

      await act(async () => {
        result.current.loadMore();
      });

      expect(fetcher).not.toHaveBeenCalled();
    });

    it("does not issue concurrent requests", async () => {
      const initialItems = makeItems(20);
      let resolveFirstFetch!: (value: unknown) => void;
      const firstFetch = new Promise((resolve) => {
        resolveFirstFetch = resolve;
      });
      const fetcher = vi.fn().mockReturnValueOnce(firstFetch);
      const { result } = renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      // Start a fetch and leave it in-flight
      act(() => {
        result.current.loadMore();
      });

      // A second call while in-flight should be a no-op
      act(() => {
        result.current.loadMore();
      });

      await act(async () => {
        resolveFirstFetch({ items: [], nextCursor: null, hasMore: false });
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  // ─── IntersectionObserver ─────────────────────────────────────────────────

  describe("IntersectionObserver", () => {
    it("triggers loadMore when the sentinel becomes visible", async () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
      renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      await act(async () => {
        intersectionObserverCallback([{ isIntersecting: true } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
      });

      expect(fetcher).toHaveBeenCalledWith("cursor-1");
    });

    it("does not trigger loadMore when not intersecting", () => {
      const initialItems = makeItems(20);
      const fetcher = vi.fn();
      renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: "cursor-1", fetcher })
      );

      act(() => {
        intersectionObserverCallback([{ isIntersecting: false } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
      });

      expect(fetcher).not.toHaveBeenCalled();
    });

    it("does not trigger loadMore via observer when hasMore is false", () => {
      const initialItems = makeItems(5);
      const fetcher = vi.fn();
      renderHook(() =>
        useCursorPagination({ initialItems, initialCursor: null, fetcher })
      );

      act(() => {
        intersectionObserverCallback([{ isIntersecting: true } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
      });

      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  // ─── Reset behavior ───────────────────────────────────────────────────────

  describe("reset behavior", () => {
    it("resets items and hasMore when initial data changes", async () => {
      const originalItems = makeItems(20);
      const newItems = makeItems(5, 100);
      const fetcher = vi.fn();

      const { result, rerender } = renderHook<UseCursorPaginationResult<Item>, PaginationProps>(
        ({ items, cursor }) =>
          useCursorPagination({ initialItems: items, initialCursor: cursor, fetcher }),
        { initialProps: { items: originalItems, cursor: "cursor-1" } }
      );

      expect(result.current.items).toEqual(originalItems);
      expect(result.current.hasMore).toBe(true);

      rerender({ items: newItems, cursor: null });

      await waitFor(() => {
        expect(result.current.items).toEqual(newItems);
        expect(result.current.hasMore).toBe(false);
      });
    });

    it("uses the new cursor on the first loadMore after a reset", async () => {
      const originalItems = makeItems(20);
      const newItems = makeItems(20, 50);
      const fetcher = vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false });

      const { result, rerender } = renderHook<UseCursorPaginationResult<Item>, PaginationProps>(
        ({ items, cursor }) =>
          useCursorPagination({ initialItems: items, initialCursor: cursor, fetcher }),
        { initialProps: { items: originalItems, cursor: "cursor-old" } }
      );

      rerender({ items: newItems, cursor: "cursor-new" });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      await act(async () => {
        result.current.loadMore();
      });

      expect(fetcher).toHaveBeenCalledWith("cursor-new");
    });
  });
});
