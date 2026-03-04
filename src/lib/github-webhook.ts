import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies the X-Hub-Signature-256 header from a GitHub webhook request.
 * Uses timingSafeEqual to prevent timing-based side-channel attacks.
 */
export function verifyGitHubSignature(
  payload: string,
  secret: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const expectedSig = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSig)
    );
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

interface DeploymentStatusPayload {
  deployment_status?: {
    state?: string;
    environment?: string;
  };
}

/**
 * Returns true only for deployment_status events with state=success
 * targeting a production environment.
 */
export function isSuccessfulDeployment(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;

  const payload = body as DeploymentStatusPayload;
  const status = payload.deployment_status;
  if (!status) return false;

  if (status.state !== "success") return false;

  const env = status.environment ?? "";
  return env.toLowerCase() === "production";
}
