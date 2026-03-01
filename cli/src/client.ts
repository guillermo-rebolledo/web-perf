import { getConfig } from "./config.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Authenticated fetch wrapper.
 * Reads base URL and API key from local config.
 * Throws ApiError on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  baseUrlOverride?: string
): Promise<T> {
  const config = getConfig();
  const baseUrl = baseUrlOverride ?? config?.baseUrl;
  const apiKey = config?.apiKey;

  if (!baseUrl) {
    throw new Error(
      "Not authenticated. Run `side auth` to log in."
    );
  }

  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      `Could not connect to ${baseUrl}. Is the server running?`
    );
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }

    if (res.status === 401) {
      throw new ApiError(
        "Your API key has expired or been revoked. Run `side auth` to re-authenticate.",
        401,
        body
      );
    }

    const message =
      (body as { error?: string } | null)?.error ??
      `HTTP ${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, body);
  }

  return res.json() as Promise<T>;
}
