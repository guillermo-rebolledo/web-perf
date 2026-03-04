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
  deployment?: {
    // GitHub standard flag — set by Vercel, GitHub Actions, etc.
    production_environment?: boolean;
  };
}

/**
 * Returns true for deployment_status events with state=success targeting a
 * production environment.
 *
 * Production is detected via two signals (either is sufficient):
 *  1. deployment.production_environment === true  — GitHub's standard flag
 *     (Vercel, GitHub Actions, and most CI platforms set this)
 *  2. deployment_status.environment contains "production" (case-insensitive)
 *     — catches platforms like Railway that use compound names such as
 *     "perflabs / production" and don't set production_environment
 */
export function isSuccessfulDeployment(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;

  const payload = body as DeploymentStatusPayload;
  const status = payload.deployment_status;
  if (!status) return false;

  if (status.state !== "success") return false;

  const isProductionFlag = payload.deployment?.production_environment === true;
  const isProductionEnv = (status.environment ?? "").toLowerCase().includes("production");

  return isProductionFlag || isProductionEnv;
}
