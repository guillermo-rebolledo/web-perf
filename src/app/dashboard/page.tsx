import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteForm } from "@/components/site-form";
import { ScoreBadge } from "@/components/score-badge";
import { Globe, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SiteWithMonitorsAndRuns } from "@/types/prisma";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const sites: SiteWithMonitorsAndRuns[] = await prisma.site.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      monitors: {
        include: {
          runs: {
            where: {
              status: "success",
            },
            orderBy: {
              completedAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Web Performance Lab</h1>
          <p className="text-muted-foreground">
            Monitor and analyze your website performance
          </p>
        </div>
        <SiteForm />
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No sites yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first site to start monitoring performance
            </p>
            <SiteForm triggerButton={<Button>Create Your First Site</Button>} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            const latestRun = site.monitors
              .flatMap((m) => m.runs)
              .sort(
                (a, b) =>
                  new Date(b.completedAt!).getTime() -
                  new Date(a.completedAt!).getTime()
              )[0];

            return (
              <Link key={site.id} href={`/sites/${site.id}`}>
                <Card className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">
                          {site.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {site.url}
                        </CardDescription>
                      </div>
                      {latestRun && (
                        <ScoreBadge
                          score={latestRun.performanceScore}
                          className="ml-2"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{site.monitors.length} monitor(s)</span>
                      </div>
                      {latestRun?.completedAt && (
                        <span>
                          {formatDistanceToNow(new Date(latestRun.completedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
