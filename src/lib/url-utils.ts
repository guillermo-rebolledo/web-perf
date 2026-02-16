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
