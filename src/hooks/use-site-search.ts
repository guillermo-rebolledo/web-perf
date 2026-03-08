"use client";

import { useState, useEffect } from "react";

export interface SiteResult {
  id: string;
  name: string;
  url: string;
}

interface UseSiteSearchReturn {
  results: SiteResult[];
  loading: boolean;
  error: string | null;
}

export function useSiteSearch(query: string): UseSiteSearchReturn {
  const [results, setResults] = useState<SiteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    // Empty query — nothing to fetch. Clear any stale loading state via cleanup.
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const timer = setTimeout(() => {
      setLoading(true);

      fetch(`/api/sites/search?q=${encodeURIComponent(trimmed)}`, { signal })
        .then((res) => {
          if (!res.ok) throw new Error("Search failed");
          return res.json() as Promise<{ results: SiteResult[] }>;
        })
        .then(({ results: data }) => {
          setResults(data);
          setError(null);
          setLoading(false);
        })
        .catch((_err: unknown) => {
          if (!signal.aborted) {
            setError("Search failed");
            setResults([]);
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
  }, [query]);

  return { results, loading, error };
}
