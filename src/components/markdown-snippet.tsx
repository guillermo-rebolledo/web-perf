"use client";

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { useEffect, useState } from "react";

export function MarkdownSnippet({ md }: { md: string }) {
  const [safeHtml, setSafeHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(marked.parse(md))
      .then((rawHtml) => {
        if (cancelled) return rawHtml;
        return sanitizeHtml(String(rawHtml), {
          allowedTags: sanitizeHtml.defaults.allowedTags,
          allowedAttributes: {
            a: ["href", "name", "target", "rel"],
          },
          // Explicitly restrict href to safe schemes to block javascript: URIs
          allowedSchemes: ["http", "https", "mailto"],
          // Force noopener noreferrer on all links
          transformTags: {
            a: (tagName, attribs) => ({
              tagName,
              attribs: { ...attribs, rel: "noopener noreferrer" },
            }),
          },
        });
      })
      .then((html) => {
        if (!cancelled) setSafeHtml(html);
      });
    return () => {
      cancelled = true;
    };
  }, [md]);

  if (safeHtml === null)
    return <div className="animate-pulse rounded bg-muted/50 min-h-[1.5em]" />;
  return (
    <div
      className="
        [&_h1]:font-inter [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tighter [&_h1]:mb-3 [&_h1]:mt-0
        [&_h2]:font-inter [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tighter [&_h2]:mb-2 [&_h2]:mt-4
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-none [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:tracking-tighter
        [&_p]:text-sm [&_p]:text-foreground [&_p]:tracking-tighter [&_p]:mb-2 [&_p]:last:mb-0
        [&_ul]:text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:space-y-1
        [&_ol]:text-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:space-y-1
        [&_li]:tracking-tighter
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_a]:text-primary [&_a]:font-geist-mono [&_a]:underline [&_a]:hover:opacity-80 [&_a]:focus:outline-none [&_a]:focus:ring-2 [&_a]:focus:ring-ring [&_a]:focus:ring-offset-2 [&_a]:rounded
        [&_code]:font-geist-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
      "
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
