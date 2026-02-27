#!/usr/bin/env node
import cac from "cac";
import { registerAuth } from "./commands/auth.js";
import { registerSites } from "./commands/sites.js";
import { registerMonitors } from "./commands/monitors.js";
import { registerRun } from "./commands/run.js";

const cli = cac("side");

registerAuth(cli);
registerSites(cli);
registerMonitors(cli);
registerRun(cli);

cli.help();
cli.version("0.1.0");
cli.parse();
