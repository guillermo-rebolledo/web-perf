// TypeScript interfaces for PageSpeed Insights response
export interface PSIAudit {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  numericUnit?: string;
  metricSavings?: Record<string, number>;
  [key: string]: unknown; // Allow additional properties
}

export interface PSICategory {
  score: number;
  title?: string;
  [key: string]: unknown;
}

export interface PSIResponse {
  lighthouseResult: {
    categories: {
      performance: PSICategory;
      accessibility: PSICategory;
      "best-practices": PSICategory;
      seo: PSICategory;
      [key: string]: unknown;
    };
    audits: Record<string, PSIAudit | string | unknown>;
    lighthouseVersion?: string;
    finalUrl?: string;
    runWarnings?: string[];
    fetchTime?: string;
    environment?: {
      networkUserAgent?: string;
      hostUserAgent?: string;
      benchmarkIndex?: number;
      [key: string]: unknown;
    };
    configSettings?: {
      emulatedFormFactor?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface InsightSource {
  url: string;
  totalBytes?: number;
  wastedBytes?: number;
  wastedMs?: number;
  transferSize?: number;
  depth?: number;
  // Network request details (from network-requests audit)
  resourceType?: string;
  startTime?: number;
  endTime?: number;
  mimeType?: string;
  // Resource summary details (from resource-summary audit)
  resourceSize?: number;
  requestCount?: number;
  // Layout shift details (from layout-shift-elements audit)
  node?: string;
  score?: number;
  // LCP element details (from largest-contentful-paint-element audit)
  element?: string;
  // Third-party details (from third-party-summary audit)
  mainThreadTime?: number;
  blockingTime?: number;
  // Main thread details (from mainthread-work-breakdown audit)
  group?: string;
  groupLabel?: string;
  duration?: number;
}

export interface ParsedInsight {
  insightId: string;
  title: string;
  description: string;
  score: number | null;
  scored: boolean;
  displayValue?: string;
  metricSavings?: Record<string, number>;
  sources?: InsightSource[];
}

export interface ParsedMetrics {
  // Scores (0-100)
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;

  // Run metadata
  lighthouseVersion?: string;
  finalUrl?: string;
  runWarnings: string[];

  // Environment & configuration metadata
  browserUserAgent?: string;
  benchmarkIndex?: number;
  emulatedFormFactor?: string;

  // Core Web Vitals and metrics (in milliseconds or unitless)
  lcp?: number; // Largest Contentful Paint
  inp?: number; // Interaction to Next Paint
  tbt?: number; // Total Blocking Time (fallback)
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // Extra performance metrics
  speedIndex?: number;
  tti?: number;
  totalByteWeight?: number;
  numRequests?: number;
  mainThreadWork?: number;

  // Screenshot data (base64)
  screenshot?: string;

  // Selected audits
  audits: Array<{
    auditId: string;
    title: string;
    score: number | null;
    scored: boolean;
    displayValue?: string;
    numericValue?: number;
  }>;

  // Performance insights
  insights: ParsedInsight[];
}

function isPSIAudit(audit: unknown): audit is PSIAudit {
  return (
    typeof audit === "object" &&
    audit !== null &&
    "id" in audit &&
    "title" in audit &&
    "score" in audit
  );
}

function hasScreenshotDetails(
  audit: unknown,
): audit is { details?: { data?: string } } {
  return typeof audit === "object" && audit !== null && "details" in audit;
}

function hasDiagnosticsDetails(
  audit: unknown,
): audit is { details?: { items?: Array<Record<string, unknown>> } } {
  return typeof audit === "object" && audit !== null && "details" in audit;
}

interface ChainNode {
  url?: string;
  transferSize?: number;
  children?: Record<string, ChainNode>;
  [key: string]: unknown;
}

/** Recursively flatten a network dependency chain tree into a flat list with depth. */
function flattenChains(
  chains: Record<string, ChainNode>,
  depth: number,
): InsightSource[] {
  const result: InsightSource[] = [];
  for (const node of Object.values(chains)) {
    if (typeof node.url === "string") {
      result.push({
        url: node.url,
        ...(typeof node.transferSize === "number" && { transferSize: node.transferSize }),
        depth,
      });
    }
    if (node.children && typeof node.children === "object") {
      result.push(...flattenChains(node.children, depth + 1));
    }
  }
  return result;
}

/** Extract sources from a network-tree list-section item. */
function extractChainSources(
  items: Array<Record<string, unknown>>,
): InsightSource[] | undefined {
  for (const item of items) {
    if (item.type !== "list-section") continue;
    const value = item.value as Record<string, unknown> | undefined;
    if (value?.type !== "network-tree") continue;
    const chains = value.chains as Record<string, ChainNode> | undefined;
    if (!chains || typeof chains !== "object") continue;
    const flattened = flattenChains(chains, 0);
    return flattened.length > 0 ? flattened : undefined;
  }
  return undefined;
}

export function parsePSIResponse(response: PSIResponse): ParsedMetrics {
  const { categories, audits } = response.lighthouseResult;

  // Build set of audit IDs that contribute to category scores (weight > 0)
  const scoredAuditIds = new Set<string>();
  for (const category of Object.values(categories)) {
    const refs = (category as Record<string, unknown>).auditRefs as
      | Array<{ id: string; weight: number }>
      | undefined;
    if (!Array.isArray(refs)) continue;
    for (const ref of refs) {
      if (typeof ref.weight === "number" && ref.weight > 0) {
        scoredAuditIds.add(ref.id);
      }
    }
  }

  // Extract run metadata
  const lighthouseVersion = response.lighthouseResult.lighthouseVersion;
  const finalUrl = response.lighthouseResult.finalUrl;
  const runWarnings = response.lighthouseResult.runWarnings ?? [];

  // Extract environment metadata
  const environment = response.lighthouseResult.environment;
  const browserUserAgent = environment?.networkUserAgent;
  const benchmarkIndex = environment?.benchmarkIndex;

  // Extract configuration metadata
  const configSettings = response.lighthouseResult.configSettings;
  const emulatedFormFactor = configSettings?.emulatedFormFactor;

  // Extract scores (convert from 0-1 to 0-100)
  const performanceScore = Math.round(categories.performance.score * 100);
  const accessibilityScore = Math.round(categories.accessibility.score * 100);
  const bestPracticesScore = Math.round(
    categories["best-practices"].score * 100,
  );
  const seoScore = Math.round(categories.seo.score * 100);

  // Extract Core Web Vitals - with safe access for string audits
  const getLcpValue = () => {
    const audit = audits["largest-contentful-paint"];
    return isPSIAudit(audit) ? audit.numericValue : undefined;
  };
  const getInpValue = () => {
    const audit = audits["interaction-to-next-paint"];
    return isPSIAudit(audit) ? audit.numericValue : undefined;
  };
  const getTbtValue = () => {
    const audit = audits["total-blocking-time"];
    return isPSIAudit(audit) ? audit.numericValue : undefined;
  };
  const getClsValue = () => {
    const audit = audits["cumulative-layout-shift"];
    return isPSIAudit(audit) ? audit.numericValue : undefined;
  };
  const getFcpValue = () => {
    const audit = audits["first-contentful-paint"];
    return isPSIAudit(audit) ? audit.numericValue : undefined;
  };
  const getTtfbValue = () => {
    const audit = audits["server-response-time"];
    return isPSIAudit(audit) ? audit.numericValue : undefined;
  };

  const lcp = getLcpValue();
  const inp = getInpValue();
  const tbt = getTbtValue();
  const cls = getClsValue();
  const fcp = getFcpValue();
  const ttfb = getTtfbValue();

  // Extract extra performance metrics
  const speedIndexAudit = audits["speed-index"];
  const speedIndex = isPSIAudit(speedIndexAudit)
    ? speedIndexAudit.numericValue
    : undefined;

  const ttiAudit = audits["interactive"];
  const tti = isPSIAudit(ttiAudit) ? ttiAudit.numericValue : undefined;

  const mainThreadAudit = audits["mainthread-work-breakdown"];
  const mainThreadWork = isPSIAudit(mainThreadAudit)
    ? mainThreadAudit.numericValue
    : undefined;

  const diagnosticsAudit = audits["diagnostics"];
  let totalByteWeight: number | undefined;
  let numRequests: number | undefined;
  if (hasDiagnosticsDetails(diagnosticsAudit)) {
    const item = diagnosticsAudit.details?.items?.[0];
    if (item) {
      totalByteWeight =
        typeof item.totalByteWeight === "number"
          ? item.totalByteWeight
          : undefined;
      numRequests =
        typeof item.numRequests === "number" ? item.numRequests : undefined;
    }
  }

  // Extract screenshot from final-screenshot audit
  const screenshotAudit = audits["final-screenshot"];
  const screenshot = hasScreenshotDetails(screenshotAudit)
    ? screenshotAudit.details?.data
    : undefined;

  // Diagnostic audits to promote to insights (have useful per-resource details)
  const DIAGNOSTIC_ALLOWLIST = new Set([
    // Original diagnostics
    "unused-javascript",
    "unused-css-rules",
    "redirects",
    "total-byte-weight",
    "bootup-time",

    // Network diagnostics (for root-cause analysis)
    "network-requests",
    "network-server-latency",
    "network-rtt",
    "resource-summary",
    "third-party-summary",

    // Rendering diagnostics
    "layout-shift-elements",
    "largest-contentful-paint-element",
    "lcp-lazy-loaded",

    // Main thread diagnostics
    "long-tasks",
    "mainthread-work-breakdown",

    // JavaScript diagnostics
    "legacy-javascript",
    "duplicated-javascript",
  ]);

  // Select failed or warning audits (score < 0.9 or no score but has numeric value)
  // Exclude insight audits and allowlisted diagnostics — those are shown in the insights section
  const selectedAudits = Object.entries(audits)
    .filter(([id, audit]) => {
      // Skip string audits (they're just references)
      if (typeof audit === "string") return false;
      if (!isPSIAudit(audit)) return false;
      // Skip audits that will appear as insights
      if (id.endsWith("-insight") || DIAGNOSTIC_ALLOWLIST.has(id)) return false;

      // Include audits with low scores or important metrics
      return (
        (audit.score !== null && audit.score < 0.9) ||
        (audit.score === null &&
          audit.numericValue !== undefined &&
          audit.numericValue > 0)
      );
    })
    .map(([id, audit]) => {
      if (!isPSIAudit(audit)) return null;

      return {
        auditId: id,
        title: audit.title,
        score: audit.score,
        scored: scoredAuditIds.has(id),
        displayValue: audit.displayValue,
        numericValue: audit.numericValue,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => {
      // Sort by score ascending (worst first), then by numeric value descending
      if (a.score !== null && b.score !== null) {
        return a.score - b.score;
      }
      return (b.numericValue ?? 0) - (a.numericValue ?? 0);
    })
    .slice(0, 15); // Top 15 audits

  /** Extract sources from an audit's details.items */
  function extractSources(
    audit: PSIAudit,
  ): InsightSource[] | undefined {
    const details = (audit as Record<string, unknown>).details as
      | { items?: Array<Record<string, unknown>> }
      | undefined;
    const items = Array.isArray(details?.items) ? details.items : [];
    // Try flat items first (render-blocking, image-delivery, unused-js, etc.)
    const flatSources = items
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => {
        const source: InsightSource = {
          url: (item.url as string) || (item.entity as string) || "",
        };

        // Standard fields
        if (typeof item.totalBytes === "number") source.totalBytes = item.totalBytes;
        if (typeof item.wastedBytes === "number") source.wastedBytes = item.wastedBytes;
        if (typeof item.wastedMs === "number") source.wastedMs = item.wastedMs;
        if (typeof item.transferSize === "number") source.transferSize = item.transferSize;

        // Network request fields
        if (typeof item.resourceType === "string") source.resourceType = item.resourceType;
        if (typeof item.startTime === "number") source.startTime = item.startTime;
        if (typeof item.endTime === "number") source.endTime = item.endTime;
        if (typeof item.mimeType === "string") source.mimeType = item.mimeType;

        // Resource summary fields
        if (typeof item.resourceSize === "number") source.resourceSize = item.resourceSize;
        if (typeof item.requestCount === "number") source.requestCount = item.requestCount;

        // Layout shift fields
        if (typeof item.node === "object") {
          source.node = JSON.stringify(item.node);
        }
        if (typeof item.score === "number") source.score = item.score;

        // LCP element fields
        if (typeof item.element === "object") {
          source.element = JSON.stringify(item.element);
        }

        // Third-party fields
        if (typeof item.mainThreadTime === "number") source.mainThreadTime = item.mainThreadTime;
        if (typeof item.blockingTime === "number") source.blockingTime = item.blockingTime;

        // Main thread work breakdown fields
        if (typeof item.group === "string") source.group = item.group;
        if (typeof item.groupLabel === "string") source.groupLabel = item.groupLabel;
        if (typeof item.duration === "number") source.duration = item.duration;

        return source;
      })
      .filter((item) => item.url !== ""); // Only keep items with URLs or entities

    if (flatSources.length > 0) return flatSources;
    // Fall back to chain tree extraction (network-dependency-tree-insight)
    return extractChainSources(items);
  }

  // Extract performance insights (audits ending with "-insight" + allowlisted diagnostics)
  const insights: ParsedInsight[] = Object.entries(audits)
    .filter(([id, audit]) => {
      if (!isPSIAudit(audit)) return false;
      const isInsight = id.endsWith("-insight");
      const isAllowlisted = DIAGNOSTIC_ALLOWLIST.has(id);
      if (!isInsight && !isAllowlisted) return false;
      // Only include failing/warning (score < 1 and not null)
      return audit.score !== null && audit.score < 1;
    })
    .map(([id, audit]) => {
      const a = audit as PSIAudit;
      const sources = extractSources(a);
      return {
        insightId: id,
        title: a.title,
        description: a.description ?? "",
        score: a.score,
        scored: scoredAuditIds.has(id),
        displayValue: a.displayValue,
        metricSavings: a.metricSavings as
          | Record<string, number>
          | undefined,
        ...(sources && sources.length > 0 ? { sources } : {}),
      };
    })
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

  return {
    performanceScore,
    accessibilityScore,
    bestPracticesScore,
    seoScore,
    lighthouseVersion,
    finalUrl,
    runWarnings,
    browserUserAgent,
    benchmarkIndex,
    emulatedFormFactor,
    lcp,
    inp: inp ?? tbt, // Use TBT as fallback
    tbt,
    cls,
    fcp,
    ttfb,
    speedIndex,
    tti,
    totalByteWeight,
    numRequests,
    mainThreadWork,
    screenshot,
    audits: selectedAudits,
    insights,
  };
}

export async function fetchPageSpeedInsights(
  url: string,
  strategy: "mobile" | "desktop",
  apiKey: string,
): Promise<PSIResponse> {
  const categories = ["performance", "accessibility", "best-practices", "seo"];
  const apiUrl = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );

  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("strategy", strategy);
  categories.forEach((cat) => apiUrl.searchParams.append("category", cat));
  apiUrl.searchParams.set("key", apiKey);

  const response = await fetch(apiUrl.toString(), {
    headers: {
      "User-Agent": "Web-Performance-Lab/1.0",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PageSpeed Insights API error (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json();

  // Basic validation - just check the structure exists
  if (!data?.lighthouseResult?.categories || !data?.lighthouseResult?.audits) {
    throw new Error("Invalid PageSpeed Insights response structure");
  }

  return data;
}
