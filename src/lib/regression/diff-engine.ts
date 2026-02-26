import { PrismaClient, Run, RunStatus } from "@prisma/client";
import type { InsightSource } from "@/lib/psi-parser";

const prisma = new PrismaClient();

/**
 * Detailed before/after diff summary across 4 dimensions
 */
export interface DiffSummary {
  network: {
    totalBytesDelta: number;
    requestCountDelta: number;
    imageBytesDelta: number;
    jsBytesDelta: number;
    cssBytesDelta: number;
    fontBytesDelta: number;
    thirdPartyBytesDelta: number;
    newDomains: string[];
    removedDomains: string[];
  };
  mainThread: {
    scriptingTimeDelta: number;
    renderingTimeDelta: number;
    longTaskCountDelta: number;
    totalMainThreadTimeDelta: number;
  };
  rendering: {
    lcpResourceChanged: boolean;
    lcpResourceBefore: string | null;
    lcpResourceAfter: string | null;
    clsShiftSourcesChanged: boolean;
    clsElementCount: number;
  };
  backend: {
    ttfbDelta: number;
    serverLatencyDelta: number;
  };
}

/**
 * Extract unique domains from network request sources
 */
function extractDomains(resources: InsightSource[]): Set<string> {
  const domains = new Set<string>();

  for (const resource of resources) {
    try {
      const url = new URL(resource.url);
      domains.add(url.hostname);
    } catch {
      // Invalid URL, skip
    }
  }

  return domains;
}

/**
 * Group resources by type and sum their sizes
 */
function groupResourcesByType(
  resources: InsightSource[],
): Record<string, { bytes: number; count: number }> {
  const groups: Record<string, { bytes: number; count: number }> = {};

  for (const resource of resources) {
    const type = resource.resourceType || "other";
    if (!groups[type]) {
      groups[type] = { bytes: 0, count: 0 };
    }
    groups[type].bytes += resource.transferSize || resource.totalBytes || 0;
    groups[type].count += 1;
  }

  return groups;
}

/**
 * Extract third-party byte count from third-party-summary insight
 */
function extractThirdPartyBytes(insights: Array<{ insightId: string; sources?: unknown }>): number {
  const thirdPartyInsight = insights.find(
    (i) => i.insightId === "third-party-summary",
  );

  if (!thirdPartyInsight || !thirdPartyInsight.sources) {
    return 0;
  }

  const sources = thirdPartyInsight.sources as InsightSource[];
  return sources.reduce(
    (sum, source) => sum + (source.transferSize || source.totalBytes || 0),
    0,
  );
}

/**
 * Extract scripting/rendering time from mainthread-work-breakdown insight
 */
function extractMainThreadBreakdown(
  insights: Array<{ insightId: string; sources?: unknown }>,
): { scripting: number; rendering: number } {
  const breakdownInsight = insights.find(
    (i) => i.insightId === "mainthread-work-breakdown",
  );

  if (!breakdownInsight || !breakdownInsight.sources) {
    return { scripting: 0, rendering: 0 };
  }

  const sources = breakdownInsight.sources as InsightSource[];
  const scripting =
    sources.find((s) => s.group === "scriptEvaluation")?.duration || 0;
  const rendering =
    sources.find((s) => s.group === "styleLayout" || s.group === "paintCompositeRender")?.duration || 0;

  return { scripting, rendering };
}

/**
 * Extract LCP resource URL from largest-contentful-paint-element insight
 */
function extractLCPResource(
  insights: Array<{ insightId: string; sources?: unknown }>,
): string | null {
  const lcpInsight = insights.find(
    (i) => i.insightId === "largest-contentful-paint-element",
  );

  if (!lcpInsight || !lcpInsight.sources) {
    return null;
  }

  const sources = lcpInsight.sources as InsightSource[];
  return sources[0]?.url || null;
}

/**
 * Calculate detailed diff summary between baseline and current run
 *
 * This function compares 4 dimensions:
 * - Network: byte deltas by type, new/removed domains, third-party changes
 * - Main thread: scripting/rendering time, long tasks
 * - Rendering: LCP resource changes, CLS shift sources
 * - Backend: TTFB, server latency
 *
 * @param currentRun - The run with regression
 * @param prismaClient - Optional Prisma client
 * @returns Detailed diff summary
 */
export async function calculateDiffSummary(
  currentRun: Run,
  prismaClient?: PrismaClient,
): Promise<DiffSummary> {
  const db = prismaClient || prisma;

  // Find baseline run (most recent successful run before current run)
  const baselineRun = await db.run.findFirst({
    where: {
      monitorId: currentRun.monitorId,
      status: RunStatus.success,
      completedAt: { lt: currentRun.completedAt || new Date() },
    },
    orderBy: {
      completedAt: "desc",
    },
    include: {
      insights: true,
    },
  });

  if (!baselineRun) {
    // No baseline available, return zero deltas
    return {
      network: {
        totalBytesDelta: 0,
        requestCountDelta: 0,
        imageBytesDelta: 0,
        jsBytesDelta: 0,
        cssBytesDelta: 0,
        fontBytesDelta: 0,
        thirdPartyBytesDelta: 0,
        newDomains: [],
        removedDomains: [],
      },
      mainThread: {
        scriptingTimeDelta: 0,
        renderingTimeDelta: 0,
        longTaskCountDelta: 0,
        totalMainThreadTimeDelta: 0,
      },
      rendering: {
        lcpResourceChanged: false,
        lcpResourceBefore: null,
        lcpResourceAfter: null,
        clsShiftSourcesChanged: false,
        clsElementCount: 0,
      },
      backend: {
        ttfbDelta: 0,
        serverLatencyDelta: 0,
      },
    };
  }

  // Load current run insights
  const currentInsights = await db.insight.findMany({
    where: { runId: currentRun.id },
  });

  // === Network diff ===
  const baselineNetworkRequests =
    (baselineRun.insights.find((i) => i.insightId === "network-requests")
      ?.sources as unknown as InsightSource[]) || [];
  const currentNetworkRequests =
    (currentInsights.find((i) => i.insightId === "network-requests")
      ?.sources as unknown as InsightSource[]) || [];

  const baselineDomains = extractDomains(baselineNetworkRequests);
  const currentDomains = extractDomains(currentNetworkRequests);

  const newDomains = Array.from(currentDomains).filter(
    (d) => !baselineDomains.has(d),
  );
  const removedDomains = Array.from(baselineDomains).filter(
    (d) => !currentDomains.has(d),
  );

  const baselineResourceGroups = groupResourcesByType(baselineNetworkRequests);
  const currentResourceGroups = groupResourcesByType(currentNetworkRequests);

  const imageBytesDelta =
    (currentResourceGroups.image?.bytes || 0) -
    (baselineResourceGroups.image?.bytes || 0);
  const jsBytesDelta =
    (currentResourceGroups.script?.bytes || 0) -
    (baselineResourceGroups.script?.bytes || 0);
  const cssBytesDelta =
    (currentResourceGroups.stylesheet?.bytes || 0) -
    (baselineResourceGroups.stylesheet?.bytes || 0);
  const fontBytesDelta =
    (currentResourceGroups.font?.bytes || 0) -
    (baselineResourceGroups.font?.bytes || 0);

  const totalBytesDelta =
    (currentRun.totalByteWeight || 0) - (baselineRun.totalByteWeight || 0);
  const requestCountDelta =
    (currentRun.numRequests || 0) - (baselineRun.numRequests || 0);

  const thirdPartyBytesDelta =
    extractThirdPartyBytes(currentInsights) -
    extractThirdPartyBytes(baselineRun.insights);

  // === Main thread diff ===
  const baselineMainThread = extractMainThreadBreakdown(baselineRun.insights);
  const currentMainThread = extractMainThreadBreakdown(currentInsights);

  const scriptingTimeDelta =
    currentMainThread.scripting - baselineMainThread.scripting;
  const renderingTimeDelta =
    currentMainThread.rendering - baselineMainThread.rendering;

  const totalMainThreadTimeDelta =
    (currentRun.mainThreadWork || 0) - (baselineRun.mainThreadWork || 0);

  // Long tasks count delta (from long-tasks insight)
  const baselineLongTasks =
    (baselineRun.insights.find((i) => i.insightId === "long-tasks")
      ?.sources as unknown as InsightSource[]) || [];
  const currentLongTasks =
    (currentInsights.find((i) => i.insightId === "long-tasks")
      ?.sources as unknown as InsightSource[]) || [];
  const longTaskCountDelta = currentLongTasks.length - baselineLongTasks.length;

  // === Rendering diff ===
  const lcpResourceBefore = extractLCPResource(baselineRun.insights);
  const lcpResourceAfter = extractLCPResource(currentInsights);
  const lcpResourceChanged = lcpResourceBefore !== lcpResourceAfter;

  const baselineClsElements =
    (baselineRun.insights.find((i) => i.insightId === "layout-shift-elements")
      ?.sources as unknown as InsightSource[]) || [];
  const currentClsElements =
    (currentInsights.find((i) => i.insightId === "layout-shift-elements")
      ?.sources as unknown as InsightSource[]) || [];

  const clsShiftSourcesChanged =
    JSON.stringify(baselineClsElements) !== JSON.stringify(currentClsElements);

  // === Backend diff ===
  const ttfbDelta = (currentRun.ttfb || 0) - (baselineRun.ttfb || 0);

  // Server latency from network-server-latency insight
  const baselineServerLatency =
    (baselineRun.insights.find((i) => i.insightId === "network-server-latency")
      ?.sources as unknown as InsightSource[])?.[0]?.duration || 0;
  const currentServerLatency =
    (currentInsights.find((i) => i.insightId === "network-server-latency")
      ?.sources as unknown as InsightSource[])?.[0]?.duration || 0;
  const serverLatencyDelta = currentServerLatency - baselineServerLatency;

  return {
    network: {
      totalBytesDelta,
      requestCountDelta,
      imageBytesDelta,
      jsBytesDelta,
      cssBytesDelta,
      fontBytesDelta,
      thirdPartyBytesDelta,
      newDomains,
      removedDomains,
    },
    mainThread: {
      scriptingTimeDelta,
      renderingTimeDelta,
      longTaskCountDelta,
      totalMainThreadTimeDelta,
    },
    rendering: {
      lcpResourceChanged,
      lcpResourceBefore,
      lcpResourceAfter,
      clsShiftSourcesChanged,
      clsElementCount: currentClsElements.length,
    },
    backend: {
      ttfbDelta,
      serverLatencyDelta,
    },
  };
}
