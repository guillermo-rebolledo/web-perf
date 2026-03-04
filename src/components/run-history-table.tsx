/**
 * RunHistoryTable — sortable table of individual runs.
 *
 * Displays one row per successful run with scores (via ScoreBadge-matching
 * color thresholds) and raw CWV values. "View" links to the run detail page.
 * Sorted newest-first by completedAt.
 */

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { type Run } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { cn } from "@/lib/utils";

interface RunHistoryTableProps {
  runs: Run[];
}

const STATUS_LABEL = {
  success: "Good",
  warning: "Needs improvement",
  poor: "Poor",
} as const;

function cwvVariant(
  value: number,
  good: number,
  needsImprovement: number,
): "success" | "warning" | "poor" {
  if (value <= good) return "success";
  if (value <= needsImprovement) return "warning";
  return "poor";
}

function CwvCell({
  value,
  good,
  needsImprovement,
  scale = 1,
  decimals = 0,
  unit = "ms",
}: {
  value: number | null;
  good: number;
  needsImprovement: number;
  scale?: number;
  decimals?: number;
  unit?: string;
}) {
  if (value === null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const displayValue = (value * scale).toFixed(decimals);
  const variant = cwvVariant(value, good, needsImprovement);

  return (
    <Badge
      variant={variant}
      className="font-mono tabular-nums"
      aria-label={`${displayValue}${unit} — ${STATUS_LABEL[variant]}`}
    >
      {displayValue}
      {unit}
    </Badge>
  );
}

export function RunHistoryTable({ runs }: RunHistoryTableProps) {
  const sorted = [...runs].sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
        No runs to display
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Performance</TableHead>
          <TableHead>Accessibility</TableHead>
          <TableHead>Best Practices</TableHead>
          <TableHead>SEO</TableHead>
          {/* aria-label expands abbreviations — title is inaccessible to keyboard/touch users */}
          <TableHead aria-label="Largest Contentful Paint">LCP</TableHead>
          <TableHead aria-label="Cumulative Layout Shift (scaled ×1000)">CLS ×1k</TableHead>
          <TableHead aria-label="First Contentful Paint">FCP</TableHead>
          <TableHead aria-label="Time to First Byte">TTFB</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="whitespace-nowrap">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {run.completedAt
                  ? format(new Date(run.completedAt), "MMM d, yyyy HH:mm")
                  : "—"}
              </span>
            </TableCell>
            <TableCell>
              <ScoreBadge score={run.performanceScore} />
            </TableCell>
            <TableCell>
              <ScoreBadge score={run.accessibilityScore} />
            </TableCell>
            <TableCell>
              <ScoreBadge score={run.bestPracticesScore} />
            </TableCell>
            <TableCell>
              <ScoreBadge score={run.seoScore} />
            </TableCell>
            <TableCell>
              {/* LCP: good ≤2500ms, NI ≤4000ms */}
              <CwvCell value={run.lcp} good={2500} needsImprovement={4000} />
            </TableCell>
            <TableCell>
              {/* CLS×1000: good ≤0.1, NI ≤0.25 */}
              <CwvCell
                value={run.cls}
                good={0.1}
                needsImprovement={0.25}
                scale={1000}
                decimals={1}
                unit=""
              />
            </TableCell>
            <TableCell>
              {/* FCP: good ≤1800ms, NI ≤3000ms */}
              <CwvCell value={run.fcp} good={1800} needsImprovement={3000} />
            </TableCell>
            <TableCell>
              {/* TTFB: good ≤800ms, NI ≤1800ms */}
              <CwvCell value={run.ttfb} good={800} needsImprovement={1800} />
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/runs/${run.id}`}
                className={cn(
                  "inline-flex items-center gap-1 text-xs text-muted-foreground",
                  "hover:text-secondary transition-colors duration-150",
                )}
              >
                View
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
