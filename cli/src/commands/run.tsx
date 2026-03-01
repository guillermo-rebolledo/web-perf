import React from "react";
import type { CAC } from "cac";
import { intro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { render } from "ink";
import { apiFetch, ApiError } from "../client.js";
import { getConfig } from "../config.js";
import { RunResult, StaticRenderer } from "../ui.js";
import type {
  SiteListItem,
  RunTriggerResult,
  RunStatusResult,
  RunSummary,
  RunRegressionsResult,
} from "../types/api.js";

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function registerRun(cli: CAC) {
  cli
    .command("run [monitorId]", "Trigger an on-demand PSI run and display results")
    .option("--url <url>", "Site URL — resolves to the first monitor automatically")
    .action(async (monitorIdArg: string | undefined, options: { url?: string }) => {
      intro(pc.bgCyan(pc.black(" side run ")));

      const s = spinner();

      // ── Resolve monitor ID ───────────────────────────────────────────────
      let monitorId: string;

      if (options.url) {
        s.start("Looking up site…");
        let sites: SiteListItem[];
        try {
          sites = await apiFetch<SiteListItem[]>("/api/sites");
        } catch (err) {
          s.stop("Failed to fetch sites", 1);
          log.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }

        if (sites.length === 0) {
          s.stop("No sites found", 1);
          log.error(
            `No sites registered. Add one with ${pc.cyan("side sites add <url> --monitor")}.`
          );
          process.exit(1);
        }

        const target = options.url.replace(/\/$/, "");
        const site = sites.find(
          (s) => s.url === target || s.url === options.url
        );

        if (!site) {
          s.stop("Site not found", 1);
          log.error(
            `No site matches ${pc.cyan(options.url)}. Run ${pc.cyan("side sites list")} to see your registered sites.`
          );
          process.exit(1);
        }

        if (site.monitors.length === 0) {
          s.stop("No monitors", 1);
          log.error(
            `Site "${site.name}" has no monitors. Add one with ${pc.cyan(`side monitors add --site ${site.id}`)}.`
          );
          process.exit(1);
        }

        monitorId = site.monitors[0]!.id;
        s.stop(`Using monitor ${pc.dim(monitorId)}`);
      } else if (monitorIdArg) {
        monitorId = monitorIdArg;
      } else {
        log.error("Provide a monitor ID or --url <url>");
        process.exit(1);
      }

      // ── Trigger run ──────────────────────────────────────────────────────
      let runId: string;

      s.start("Queueing run…");
      try {
        const result = await apiFetch<RunTriggerResult>(
          `/api/monitors/${monitorId}/run`,
          { method: "POST" }
        );
        runId = result.runId;
        s.stop(`Run queued  ${pc.dim(runId)}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const body = err.body as { runId?: string };
          if (body.runId) {
            runId = body.runId;
            s.stop(`Run already in progress — tracking ${pc.dim(runId)}`);
          } else {
            s.stop("Run already in progress", 1);
            process.exit(1);
          }
        } else if (err instanceof ApiError && err.status === 404) {
          s.stop("Monitor not found", 1);
          log.error(
            `Monitor ${pc.cyan(monitorId)} not found. Run ${pc.cyan("side sites list")} to see your monitor IDs.`
          );
          process.exit(1);
        } else {
          s.stop("Failed to queue run", 1);
          log.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      }

      // ── Poll for completion ──────────────────────────────────────────────
      s.start("Waiting for run to complete…");
      const deadline = Date.now() + TIMEOUT_MS;

      poll: while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);

        let status: RunStatusResult;
        try {
          status = await apiFetch<RunStatusResult>(`/api/runs/${runId}/status`);
        } catch {
          continue;
        }

        switch (status.status) {
          case "success":
            s.stop("Run completed");
            break poll;
          case "failed":
            s.stop("Run failed", 1);
            log.error(status.errorMessage ?? "Unknown error");
            process.exit(1);
            break;
          case "running":
            s.message("Run in progress…");
            break;
        }
      }

      if (Date.now() >= deadline) {
        s.stop("Timed out", 1);
        process.exit(1);
      }

      // ── Fetch results ────────────────────────────────────────────────────
      s.start("Fetching results…");
      let run: RunSummary;
      let regressionsResult: RunRegressionsResult;
      try {
        [run, regressionsResult] = await Promise.all([
          apiFetch<RunSummary>(`/api/runs/${runId}`),
          apiFetch<RunRegressionsResult>(`/api/runs/${runId}/regressions`),
        ]);
      } catch (err) {
        s.stop("Failed to fetch results", 1);
        log.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
      s.stop("Results ready");

      // ── Render with ink ──────────────────────────────────────────────────
      const config = getConfig();
      const { waitUntilExit } = render(
        <StaticRenderer>
          <RunResult
            run={run}
            alerts={regressionsResult.alerts}
            baseUrl={config?.baseUrl}
            runId={runId}
          />
        </StaticRenderer>
      );
      await waitUntilExit();
    });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
