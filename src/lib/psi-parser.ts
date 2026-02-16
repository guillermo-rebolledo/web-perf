// TypeScript interfaces for PageSpeed Insights response
export interface PSIAudit {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  numericUnit?: string;
  [key: string]: any; // Allow additional properties
}

export interface PSICategory {
  score: number;
  title?: string;
  [key: string]: any;
}

export interface PSIResponse {
  lighthouseResult: {
    categories: {
      performance: PSICategory;
      accessibility: PSICategory;
      "best-practices": PSICategory;
      seo: PSICategory;
      [key: string]: any;
    };
    audits: Record<string, PSIAudit | string | any>;
    fetchTime?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ParsedMetrics {
  // Scores (0-100)
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;

  // Core Web Vitals and metrics (in milliseconds or unitless)
  lcp?: number; // Largest Contentful Paint
  inp?: number; // Interaction to Next Paint
  tbt?: number; // Total Blocking Time (fallback)
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // Selected audits
  audits: Array<{
    auditId: string;
    title: string;
    score: number | null;
    displayValue?: string;
    numericValue?: number;
  }>;
}

export function parsePSIResponse(response: PSIResponse): ParsedMetrics {
  const { categories, audits } = response.lighthouseResult;

  // Extract scores (convert from 0-1 to 0-100)
  const performanceScore = Math.round(categories.performance.score * 100);
  const accessibilityScore = Math.round(categories.accessibility.score * 100);
  const bestPracticesScore = Math.round(categories["best-practices"].score * 100);
  const seoScore = Math.round(categories.seo.score * 100);

  // Extract Core Web Vitals - with safe access for string audits
  const getLcpValue = () => {
    const audit = audits["largest-contentful-paint"];
    return typeof audit === 'object' ? audit.numericValue : undefined;
  };
  const getInpValue = () => {
    const audit = audits["interaction-to-next-paint"];
    return typeof audit === 'object' ? audit.numericValue : undefined;
  };
  const getTbtValue = () => {
    const audit = audits["total-blocking-time"];
    return typeof audit === 'object' ? audit.numericValue : undefined;
  };
  const getClsValue = () => {
    const audit = audits["cumulative-layout-shift"];
    return typeof audit === 'object' ? audit.numericValue : undefined;
  };
  const getFcpValue = () => {
    const audit = audits["first-contentful-paint"];
    return typeof audit === 'object' ? audit.numericValue : undefined;
  };
  const getTtfbValue = () => {
    const audit = audits["server-response-time"];
    return typeof audit === 'object' ? audit.numericValue : undefined;
  };

  const lcp = getLcpValue();
  const inp = getInpValue();
  const tbt = getTbtValue();
  const cls = getClsValue();
  const fcp = getFcpValue();
  const ttfb = getTtfbValue();

  // Select failed or warning audits (score < 0.9 or no score but has numeric value)
  const selectedAudits = Object.entries(audits)
    .filter(([_, audit]) => {
      // Skip string audits (they're just references)
      if (typeof audit === 'string') return false;
      
      // Include audits with low scores or important metrics
      return (
        (audit.score !== null && audit.score < 0.9) ||
        (audit.score === null && audit.numericValue !== undefined && audit.numericValue > 0)
      );
    })
    .map(([id, audit]) => {
      // Type guard to ensure we're working with objects
      if (typeof audit === 'string') return null;
      
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

  return {
    performanceScore,
    accessibilityScore,
    bestPracticesScore,
    seoScore,
    lcp,
    inp: inp ?? tbt, // Use TBT as fallback
    tbt,
    cls,
    fcp,
    ttfb,
    audits: selectedAudits,
  };
}

export async function fetchPageSpeedInsights(
  url: string,
  strategy: "mobile" | "desktop",
  apiKey: string
): Promise<PSIResponse> {
  const categories = ["performance", "accessibility", "best-practices", "seo"];
  const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  
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
      `PageSpeed Insights API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  
  // Basic validation - just check the structure exists
  if (!data?.lighthouseResult?.categories || !data?.lighthouseResult?.audits) {
    throw new Error("Invalid PageSpeed Insights response structure");
  }
  
  return data;
}
