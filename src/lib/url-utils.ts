import { z } from "zod";

const urlSchema = z.string().url();

/**
 * Private/reserved IP ranges and hostnames that must never be stored or
 * forwarded to external services (Slack, AI, Google PSI).
 *
 * Note: this checks the literal hostname only — no DNS resolution is
 * performed. A domain that resolves to a private IP would not be caught here,
 * but Google PSI (the party that actually fetches the URL) enforces its own
 * safelist and we never make outbound requests ourselves.
 */
const PRIVATE_IP_RANGES: RegExp[] = [
  /^127\./,                                     // 127.0.0.0/8  loopback
  /^10\./,                                      // 10.0.0.0/8   private
  /^192\.168\./,                                // 192.168.0.0/16 private
  /^172\.(1[6-9]|2\d|3[01])\./,                // 172.16.0.0/12  private
  /^169\.254\./,                                // 169.254.0.0/16 link-local / AWS metadata
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10  CGNAT
  /^\[?::1\]?$/,                                // IPv6 loopback
  /^\[?fc/i,                                    // IPv6 unique-local fc00::/7
  /^\[?fd/i,                                    // IPv6 unique-local fd00::/8
  /^\[?fe80/i,                                  // IPv6 link-local fe80::/10
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal", // GCP metadata endpoint
]);

/**
 * Returns true only if the URL:
 *  1. Uses http or https
 *  2. Does not target loopback, private, link-local, or cloud-metadata addresses
 */
export function isPublicUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return false;
    }

    for (const pattern of PRIVATE_IP_RANGES) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function canonicalizeUrl(urlString: string): string {
  // Validate URL format first
  const parsed = urlSchema.parse(urlString);

  try {
    const url = new URL(parsed);

    // Block private/internal addresses before anything is stored
    if (!isPublicUrl(url.toString())) {
      throw new Error("URL must be a publicly accessible address");
    }

    // Normalize protocol to https
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }

    // Remove www. prefix
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
    }

    // Remove trailing slash
    if (url.pathname.endsWith("/") && url.pathname !== "/") {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Sort query parameters for consistency
    url.searchParams.sort();

    return url.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${error}`);
  }
}

export function validateUrl(urlString: string): boolean {
  try {
    urlSchema.parse(urlString);
    return true;
  } catch {
    return false;
  }
}

export function extractDomain(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return "";
  }
}

export function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop();
    return filename || pathname;
  } catch {
    return url;
  }
}

const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/;

type ParsedDescriptionWithLink =
  | { kind: "plain"; text: string }
  | {
      kind: "withLink";
      before: string;
      linkText: string;
      href: string;
      after: string;
    };

/**
 * Parses a string that may contain a markdown-style link [text](url).
 * Returns structured segments so the UI can render plain text and a link separately.
 */
export function parseDescriptionWithLink(
  description: string,
): ParsedDescriptionWithLink {
  const match = description.match(markdownLinkRegex);
  if (!match || match.index === undefined) {
    return { kind: "plain", text: description };
  }
  return {
    kind: "withLink",
    before: description.slice(0, match.index),
    linkText: match[1],
    href: match[2],
    after: description.slice(match.index + match[0].length),
  };
}