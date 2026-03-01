/**
 * RunHistoryTable — sortable table of individual runs.
 *
 * Displays one row per successful run with scores (via ScoreCard-matching
 * color thresholds) and raw CWV values. "View" links to the run detail page.
 * Sorted newest-first by completedAt.
 */

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { type Run } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/score-badge";
import { cn } from "@/lib/utils";

interface RunHistoryTableProps {
  runs: Run[];
}

/** Returns a color class based on CWV thresholds (lower is better). */
function cwvClass(
  value: number | null,
  good: number,
  needsImprovement: number,
): string {
  if (value === null) return "text-muted-foreground";
  if (value <= good) return "text-score-good";
  if (value <= needsImprovement) return "text-score-warning";
  return "text-score-poor";
}

function CwvCell({
  value,
  good,
  needsImprovement,
  scale = 1,
  decimals = 0,
}: {
  value: number | null;
  good: number;
  needsImprovement: number;
  scale?: number;
  decimals?: number;
}) {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const displayValue = (value * scale).toFixed(decimals);
  return (
    <span
      className={cn(
        "font-mono text-sm tabular-nums font-semibold",
        cwvClass(value, good, needsImprovement),
      )}
    >
      {displayValue}
      {scale === 1 && "ms"}
    </span>
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
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Date</TableHead>
            <TableHead>Perf</TableHead>
            <TableHead>A11y</TableHead>
            <TableHead>BP</TableHead>
            <TableHead>SEO</TableHead>
            <TableHead className="whitespace-nowrap">LCP</TableHead>
            <TableHead className="whitespace-nowrap">CLS ×1000</TableHead>
            <TableHead className="whitespace-nowrap">FCP</TableHead>
            <TableHead className="whitespace-nowrap">TTFB</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {run.completedAt
                  ? format(new Date(run.completedAt), "MMM d, yyyy HH:mm")
                  : "—"}
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
                {/* CLS×1000: good ≤100, NI ≤250 */}
                <CwvCell
                  value={run.cls}
                  good={0.1}
                  needsImprovement={0.25}
                  scale={1000}
                  decimals={1}
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
              <TableCell>
                <Link href={`/runs/${run.id}`}>
                  <Button size="sm" variant="muted">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
