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
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ParsedInsight {
  insightId: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  metricSavings?: Record<string, number>;
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

export function parsePSIResponse(response: PSIResponse): ParsedMetrics {
  const { categories, audits } = response.lighthouseResult;

  // Extract run metadata
  const lighthouseVersion = response.lighthouseResult.lighthouseVersion;
  const finalUrl = response.lighthouseResult.finalUrl;
  const runWarnings = response.lighthouseResult.runWarnings ?? [];

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

  // Select failed or warning audits (score < 0.9 or no score but has numeric value)
  const selectedAudits = Object.entries(audits)
    .filter(([, audit]) => {
      // Skip string audits (they're just references)
      if (typeof audit === "string") return false;
      if (!isPSIAudit(audit)) return false;

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

  // Extract performance insights (audits ending with "-insight")
  const insights: ParsedInsight[] = Object.entries(audits)
    .filter(([id, audit]) => {
      if (!id.endsWith("-insight")) return false;
      if (!isPSIAudit(audit)) return false;
      // Only include failing/warning insights (score < 1 and not null)
      return audit.score !== null && audit.score < 1;
    })
    .map(([id, audit]) => {
      const a = audit as PSIAudit;
      return {
        insightId: id,
        title: a.title,
        description: a.description ?? "",
        score: a.score,
        displayValue: a.displayValue,
        metricSavings: a.metricSavings as
          | Record<string, number>
          | undefined,
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
