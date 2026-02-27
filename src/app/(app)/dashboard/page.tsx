import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteForm } from "@/components/site-form";
import { EmptySites } from "@/components/empty-sites";
import { SiteCard } from "@/components/ui/site-card";
import { RunStatus, type SiteWithMonitorsAndRuns } from "@/types/prisma";

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
              status: RunStatus.success,
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
    <div className="container mx-auto py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold font-inter tracking-tighter">
            Web Performance Lab
          </h1>
          <p className="text-muted-foreground font-inter tracking-tighter -mt-2">
            Monitor and analyze your website performance
          </p>
        </div>
        <SiteForm />
      </div>

      {sites.length === 0 ? (
        <EmptySites />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  );
}
