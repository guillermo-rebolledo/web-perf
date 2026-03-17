import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const events = await prisma.activityEvent.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });

  const hasMore = events.length === 20;
  const serialized = events.map((e) => ({
    id: e.id,
    type: e.type,
    entityId: e.entityId,
    entityType: e.entityType,
    metadata: e.metadata,
    createdAt: e.createdAt.toISOString(),
  }));

  const initialCursor = hasMore
    ? `${events[events.length - 1].createdAt.toISOString()}_${events[events.length - 1].id}`
    : null;

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-muted-foreground mt-1">A chronological log of events across your workspace.</p>
      </div>
      <ActivityTimeline initialEvents={serialized} initialCursor={initialCursor} initialHasMore={hasMore} />
    </div>
  );
}
