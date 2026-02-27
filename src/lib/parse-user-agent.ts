const BROWSERS: [RegExp, string][] = [
  [/Edg\/[\d.]+/, "Edge"],
  [/Chrome\/[\d.]+/, "Chrome"],
  [/Firefox\/[\d.]+/, "Firefox"],
  [/Safari\/[\d.]+/, "Safari"],
];

const OSES: [RegExp, string][] = [
  [/Windows NT/, "Windows"],
  [/iPhone|iPad/, "iOS"],       // before macOS: iOS UAs contain "like Mac OS X"
  [/Android/, "Android"],       // before Linux: Android UAs contain "Linux"
  [/Macintosh|Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

/** Parse a raw User-Agent string into a short human-readable label. */
export function parseUserAgent(ua: string): string {
  let browser = "Unknown browser";
  for (const [re, name] of BROWSERS) {
    if (re.test(ua)) { browser = name; break; }
  }

  let os = "Unknown OS";
  for (const [re, name] of OSES) {
    if (re.test(ua)) { os = name; break; }
  }

  return `${browser} on ${os}`;
}
