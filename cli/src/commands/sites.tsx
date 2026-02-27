import React from "react";
import type { CAC } from "cac";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { render } from "ink";
import { apiFetch } from "../client.js";
import { SitesTable, StaticRenderer } from "../ui.js";
import type { SiteListItem } from "../types/api.js";

export function registerSites(cli: CAC) {
  cli
    .command("sites <action> [url]", "Manage sites — actions: list | add <url>")
    .option("--name <name>", "Display name for the site (add only)")
    .option("--monitor", "Also create a default mobile monitor (add only)")
    .action(
      async (
        action: string,
        url: string | undefined,
        options: { name?: string; monitor?: boolean }
      ) => {
        // ── sites list ────────────────────────────────────────────────────────
        if (action === "list") {
          intro(pc.bgCyan(pc.black(" side sites list ")));

          const s = spinner();
          s.start("Fetching sites…");

          let sites: SiteListItem[];
          try {
            sites = await apiFetch<SiteListItem[]>("/api/sites");
          } catch (err) {
            s.stop("Failed to fetch sites", 1);
            log.error(err instanceof Error ? err.message : String(err));
            process.exit(1);
          }

          s.stop(`${sites.length} site(s) found`);

          if (sites.length === 0) {
            outro("No sites yet — run `side sites add <url>` to create one.");
            return;
          }

          const { waitUntilExit } = render(
            <StaticRenderer>
              <SitesTable sites={sites} />
            </StaticRenderer>
          );
          await waitUntilExit();
          outro(pc.dim("side run <monitorId>  ·  side monitors add --site <siteId>"));

        // ── sites add ─────────────────────────────────────────────────────────
        } else if (action === "add") {
          if (!url) {
            log.error("URL is required. Usage: side sites add <url>");
            process.exit(1);
          }

          intro(pc.bgCyan(pc.black(" side sites add ")));

          const name = options.name ?? new URL(url).hostname;
          const s = spinner();

          s.start(`Creating site ${pc.cyan(name)}…`);
          let site: { id: string; name: string; url: string };
          try {
            site = await apiFetch<{ id: string; name: string; url: string }>(
              "/api/sites",
              { method: "POST", body: JSON.stringify({ name, url }) }
            );
          } catch (err) {
            s.stop("Failed to create site", 1);
            log.error(err instanceof Error ? err.message : String(err));
            process.exit(1);
          }
          s.stop(`Site created  ${pc.dim(site.id)}`);

          if (options.monitor) {
            s.start("Creating mobile monitor…");
            try {
              const mon = await apiFetch<{ id: string }>("/api/monitors", {
                method: "POST",
                body: JSON.stringify({
                  siteId: site.id,
                  strategy: "mobile",
                  cadenceMinutes: 1440,
                }),
              });
              s.stop(`Monitor created  ${pc.dim(mon.id)}`);
            } catch (err) {
              s.stop("Monitor creation failed", 1);
              log.warn(err instanceof Error ? err.message : String(err));
            }
          }

          outro("Done");

        } else {
          log.error(`Unknown action '${action}'. Use: list, add <url>`);
          process.exit(1);
        }
      }
    );
}
