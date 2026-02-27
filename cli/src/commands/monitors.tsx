import React from "react";
import type { CAC } from "cac";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { render } from "ink";
import { apiFetch, ApiError } from "../client.js";
import { MonitorsTable, StaticRenderer } from "../ui.js";
import type { MonitorSummary } from "../types/api.js";

export function registerMonitors(cli: CAC) {
  cli
    .command("monitors <action>", "Manage monitors — actions: list | add")
    .option("--site <siteId>", "Site ID (required)")
    .option("--strategy <strategy>", "mobile or desktop (add only)", { default: "mobile" })
    .option("--cadence <minutes>", "Cadence in minutes (add only)", { default: "1440" })
    .action(
      async (
        action: string,
        options: { site?: string; strategy: string; cadence: string }
      ) => {
        // ── monitors list ─────────────────────────────────────────────────────
        if (action === "list") {
          intro(pc.bgCyan(pc.black(" side monitors list ")));

          if (!options.site) {
            log.error("--site <siteId> is required");
            process.exit(1);
          }

          const s = spinner();
          s.start("Fetching monitors…");

          let monitors: MonitorSummary[];
          try {
            monitors = await apiFetch<MonitorSummary[]>(
              `/api/monitors?siteId=${encodeURIComponent(options.site)}`
            );
          } catch (err) {
            s.stop("Failed to fetch monitors", 1);
            if (err instanceof ApiError && err.status === 404) {
              log.error(
                `Site ${pc.cyan(options.site)} not found. Run ${pc.cyan("side sites list")} to see your site IDs.`
              );
            } else {
              log.error(err instanceof Error ? err.message : String(err));
            }
            process.exit(1);
          }

          s.stop(`${monitors.length} monitor(s) found`);

          if (monitors.length === 0) {
            outro(
              `No monitors yet — run ${pc.cyan(`side monitors add --site ${options.site}`)} to create one.`
            );
            return;
          }

          const { waitUntilExit } = render(
            <StaticRenderer>
              <MonitorsTable monitors={monitors} />
            </StaticRenderer>
          );
          await waitUntilExit();

        // ── monitors add ──────────────────────────────────────────────────────
        } else if (action === "add") {
          intro(pc.bgCyan(pc.black(" side monitors add ")));

          if (!options.site) {
            log.error("--site <siteId> is required");
            process.exit(1);
          }

          const s = spinner();
          s.start("Creating monitor…");

          let monitor: { id: string };
          try {
            monitor = await apiFetch<{ id: string }>("/api/monitors", {
              method: "POST",
              body: JSON.stringify({
                siteId: options.site,
                strategy: options.strategy,
                cadenceMinutes: parseInt(options.cadence, 10),
              }),
            });
          } catch (err) {
            s.stop("Failed to create monitor", 1);
            if (err instanceof ApiError && err.status === 404) {
              log.error(
                `Site ${pc.cyan(options.site)} not found. Run ${pc.cyan("side sites list")} to see your site IDs.`
              );
            } else {
              log.error(err instanceof Error ? err.message : String(err));
            }
            process.exit(1);
          }

          s.stop(`Monitor created  ${pc.dim(monitor.id)}`);
          outro("Done");

        } else {
          log.error(`Unknown action '${action}'. Use: list, add`);
          process.exit(1);
        }
      }
    );
}
