import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { Activity, Hourglass } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SiteWithMonitorsAndRuns } from "@/types/prisma";

export function SiteCard({ site }: { site: SiteWithMonitorsAndRuns }) {
  const latestRun = site.monitors
    .flatMap((m) => m.runs)
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
    )[0];

  return (
    <Link href={`/sites/${site.id}`}>
      <Card className="transition-shadow hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="line-clamp-1 font-inter tracking-tighter font-semibold">
                {site.name}
              </CardTitle>
              <CardDescription className="line-clamp-1 text-xs text-muted-foreground/50 dark:text-muted-foreground/90 font-geist-mono tracking-tighter">
                {site.url}
              </CardDescription>
            </div>
            {latestRun && <ScoreBadge score={latestRun.performanceScore} />}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 text-xs text-muted-foreground font-semibold tracking-tighter">
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <div>{site.monitors.length} monitor(s)</div>
          </div>
          {latestRun?.completedAt && (
            <span className="capitalize flex items-center gap-1">
              <Hourglass className="w-3 h-3" />
              {formatDistanceToNow(new Date(latestRun.completedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
