"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UseCursorPaginationOptions<T> {
  initialItems: T[];
  initialCursor: string | null;
  fetcher: (cursor: string | null) => Promise<PaginatedResult<T>>;
}

export interface UseCursorPaginationResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  /** Attach this ref to a sentinel element at the bottom of the list to enable infinite scroll. */
  observerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Generic cursor-based pagination hook with infinite scroll support.
 *
 * Usage:
 *   const fetcher = useCallback(async (cursor) => {
 *     const res = await fetch(`/api/things?cursor=${cursor ?? ""}`);
 *     const data = await res.json();
 *     return { items: data.things, nextCursor: data.nextCursor, hasMore: data.hasMore };
 *   }, [deps]);
 *
 *   const { items, isLoading, hasMore, error, observerRef } =
 *     useCursorPagination({ initialItems, initialCursor, fetcher });
 *
 *   // In JSX: {hasMore && <div ref={observerRef} />}
 */
export function useCursorPagination<T>({
  initialItems,
  initialCursor,
  fetcher,
}: UseCursorPaginationOptions<T>): UseCursorPaginationResult<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialCursor !== null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher(nextCursor);
      setItems((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, nextCursor, fetcher]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const target = observerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMore, hasMore, isLoading]);

  // Reset when initial data changes (e.g. filter or tab change)
  useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialCursor);
    setHasMore(initialCursor !== null);
  }, [initialItems, initialCursor]);

  return { items, isLoading, hasMore, error, loadMore, observerRef };
}
