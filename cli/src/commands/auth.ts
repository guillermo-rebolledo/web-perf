import type { CAC } from "cac";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import open from "open";
import { apiFetch } from "../client.js";
import { saveConfig } from "../config.js";
import type { CliLoginPending, CliLoginStatus } from "../types/api.js";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function registerAuth(cli: CAC) {
  cli
    .command("auth", "Authenticate via browser OAuth device flow")
    .option("--url <baseUrl>", "Base URL of your Performance Lab instance")
    .action(async (options: { url?: string }) => {
      intro(pc.bgCyan(pc.black(" side auth ")));

      const baseUrl =
        options.url ?? process.env["SIDE_BASE_URL"] ?? "http://localhost:3000";

      const s = spinner();

      // ── Start login flow ──────────────────────────────────────────────────
      s.start("Starting login flow…");
      let pending: CliLoginPending;
      try {
        pending = await apiFetch<CliLoginPending>(
          "/api/cli/login",
          { method: "POST" },
          baseUrl
        );
      } catch (err) {
        s.stop("Failed to start login flow", 1);
        log.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
      s.stop("Login flow started");

      // ── Open browser ──────────────────────────────────────────────────────
      log.info(`Opening ${pc.cyan(pending.authorizeUrl)}`);
      try {
        await open(pending.authorizeUrl);
      } catch {
        log.warn("Could not open browser automatically — visit the URL above");
      }

      // ── Poll for authorization ────────────────────────────────────────────
      s.start("Waiting for authorization…");
      const deadline = Date.now() + TIMEOUT_MS;

      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);

        let status: CliLoginStatus;
        try {
          status = await apiFetch<CliLoginStatus>(
            `/api/cli/login?code=${pending.loginCode}`,
            {},
            baseUrl
          );
        } catch {
          continue; // network hiccup — keep polling
        }

        if (status.status === "authorized" && status.apiKey) {
          s.stop("Authorized!");
          saveConfig({
            baseUrl,
            apiKey: status.apiKey,
            email: status.email ?? "",
          });
          outro(`Authenticated as ${pc.bold(status.email ?? "unknown")}`);
          return;
        }

        if (status.status === "expired") {
          s.stop("Code expired", 1);
          log.error("Run `side auth` again to get a new code.");
          process.exit(1);
        }
      }

      s.stop("Timed out waiting for authorization", 1);
      process.exit(1);
    });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
