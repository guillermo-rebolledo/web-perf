import { z } from "zod";

const urlSchema = z.string().url();

export function canonicalizeUrl(urlString: string): string {
  // Validate URL first
  const parsed = urlSchema.parse(urlString);
  
  try {
    const url = new URL(parsed);
    
    // Normalize protocol to https if not localhost
    if (url.hostname !== "localhost" && url.protocol === "http:") {
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

const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/;

export function urlParser(urlStr: string): { description: string; href: string } | null {
  const match = urlStr.match(markdownLinkRegex);
  if (!match) return null;
  return {
    description: match[1],
    href: match[2],
  };
}

export type ParsedDescriptionWithLink =
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