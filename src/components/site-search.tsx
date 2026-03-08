"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Globe, Loader2, ArrowRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useSiteSearch } from "@/hooks/use-site-search";
import { cn } from "@/lib/utils";

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const { results: rawResults, loading } = useSiteSearch(query);
  // When query is empty, don't show stale results from a previous search
  const results = query.trim() ? rawResults : [];

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
  }, []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    const item = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const navigate = useCallback(
    (id: string) => {
      router.push(`/sites/${id}`);
      handleOpenChange(false);
    },
    [router, handleOpenChange],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const site = results[activeIndex];
      if (site) navigate(site.id);
    }
  }

  const hasQuery = query.trim().length > 0;
  const showResults = results.length > 0;
  const showEmpty = !loading && hasQuery && !showResults;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-xs transition-colors duration-150 hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search sites"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="hidden text-xs sm:inline">Search sites</span>
          <span className="hidden sm:inline-flex items-center gap-0.5">
            <kbd className="rounded border border-border px-1 py-px font-sans text-[10px] leading-none">
              ⌘
            </kbd>
            <kbd className="rounded border border-border px-1 py-px font-sans text-[10px] leading-none">
              K
            </kbd>
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-popover shadow-xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onKeyDown={handleKeyDown}
          // focus the input, not the dialog container
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Search sites</Dialog.Title>

          {/* ── Input row ───────────────────────────────────────── */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {loading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search your sites…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <Dialog.Close asChild>
              <kbd className="hidden cursor-pointer select-none items-center rounded border border-border px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground transition-colors hover:border-muted-foreground/50 sm:inline-flex">
                Esc
              </kbd>
            </Dialog.Close>
          </div>

          {/* ── Results list ────────────────────────────────────── */}
          {showResults && (
            <ul
              ref={listRef}
              role="listbox"
              aria-label="Site results"
              className="max-h-72 overflow-y-auto py-1.5"
            >
              {results.map((site, i) => (
                <li
                  key={site.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigate(site.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-100",
                    i === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border border-border transition-colors duration-100",
                      i === activeIndex
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Globe className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {site.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {site.url}
                    </p>
                  </div>
                  <ArrowRight
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-opacity duration-100",
                      i === activeIndex ? "opacity-100" : "opacity-0",
                    )}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* ── Empty state ─────────────────────────────────────── */}
          {showEmpty && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No sites found for{" "}
              <span className="font-medium text-foreground">
                &ldquo;{query}&rdquo;
              </span>
            </div>
          )}

          {/* ── Idle prompt ─────────────────────────────────────── */}
          {!hasQuery && !loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Type to search across your sites
            </div>
          )}

          {/* ── Keyboard hint footer ────────────────────────────── */}
          {showResults && (
            <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-px font-sans">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-px font-sans">
                  ↵
                </kbd>{" "}
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border px-1 py-px font-sans">
                  Esc
                </kbd>{" "}
                dismiss
              </span>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
