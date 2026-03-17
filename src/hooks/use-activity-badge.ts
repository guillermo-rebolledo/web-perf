"use client";

import { useState, useEffect, useRef } from "react";

export const LS_KEY = "activity_last_viewed";

export function useActivityBadge(pathname: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const isFetching = useRef(false);

  const fetchCount = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const since = localStorage.getItem(LS_KEY);
      if (!since) return;
      const res = await fetch(`/api/activity/unread-count?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      const { count } = (await res.json()) as { count: number };
      setUnreadCount(count);
    } catch {
      // best-effort
    } finally {
      isFetching.current = false;
    }
  };

  // Stamp localStorage and clear badge when on /activity
  useEffect(() => {
    if (pathname.startsWith("/activity")) {
      localStorage.setItem(LS_KEY, new Date().toISOString());
      setUnreadCount(0);
    }
  }, [pathname]);

  // Fetch on mount and on window focus
  useEffect(() => {
    void fetchCount();
    window.addEventListener("focus", fetchCount);
    return () => window.removeEventListener("focus", fetchCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { unreadCount, setUnreadCount };
}
