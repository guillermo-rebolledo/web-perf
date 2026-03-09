import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApiKeyManager } from "@/components/api-key-manager";
import { IntegrationsManager } from "@/components/integrations-manager";
import { DigestToggle } from "@/components/digest-toggle";
import { AccountSection } from "@/components/account-section";
import { MAX_INTEGRATIONS_PER_USER } from "@/lib/limits";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [keys, integrations, monitors, user] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        userAgent: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.integration.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { monitorIntegrations: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.monitor.findMany({
      where: { site: { userId: session.user.id } },
      include: { site: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { weeklyDigestEnabled: true },
    }),
  ]);

  const serializedKeys = keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
    userAgent: k.userAgent ?? null,
  }));

  const serializedIntegrations = integrations.map((i) => ({
    id: i.id,
    name: i.name,
    type: i.type,
    isActive: i.isActive,
    monitorCount: i._count.monitorIntegrations,
    createdAt: i.createdAt.toISOString(),
  }));

  const serializedMonitors = monitors.map((m) => ({
    id: m.id,
    label: `${m.site.name} (${m.strategy})`,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings and API access.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-medium">API Keys</h2>
        <ApiKeyManager initialKeys={serializedKeys} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Notification Integrations</h2>
        <IntegrationsManager
          initialIntegrations={serializedIntegrations}
          monitors={serializedMonitors}
          limit={MAX_INTEGRATIONS_PER_USER}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Notifications</h2>
        <DigestToggle initialEnabled={user.weeklyDigestEnabled} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Account</h2>
        <AccountSection />
      </section>
    </div>
  );
}
