/**
 * Lightweight structured logger.
 *
 * Usage:
 *   const log = createLogger("Worker");
 *   log.info("Processing job", { jobId, runId });
 *   log.error("Job failed", err, { jobId });
 *
 * Levels (lowest → highest): debug | info | warn | error
 * Set LOG_LEVEL env var to control the minimum level emitted (default: "info").
 *
 * Output format:
 *   - development: human-readable prefixed lines
 *   - production:  JSON (one object per line, suitable for log aggregators)
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return raw in LEVELS ? (raw as LogLevel) : "info";
}

const isProduction = process.env.NODE_ENV === "production";

// Resolved once at module load — avoids re-reading env on every log call.
let configuredLevel = resolveLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[configuredLevel];
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { errorMessage: err.message, stack: err.stack };
  }
  return { error: String(err) };
}

function emit(
  level: LogLevel,
  module: string,
  msg: string,
  err?: unknown,
  ctx?: LogContext,
): void {
  if (!shouldLog(level)) return;

  if (isProduction) {
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      module,
      msg,
      ...ctx,
      ...(err !== undefined ? serializeError(err) : {}),
    };
    // Route to the appropriate console method so platforms capture the right level.
    if (level === "error") {
      console.error(JSON.stringify(entry));
    } else if (level === "warn") {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  } else {
    const ts = new Date().toISOString();
    const label = level.toUpperCase().padEnd(5);
    const prefix = `${ts} ${label} [${module}]`;
    const parts: unknown[] = [prefix, msg];
    if (ctx !== undefined) parts.push(ctx);
    if (err !== undefined) parts.push(err);

    if (level === "error") {
      console.error(...parts);
    } else if (level === "warn") {
      console.warn(...parts);
    } else {
      console.log(...parts);
    }
  }
}

export interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, err?: unknown, ctx?: LogContext): void;
}

/**
 * Creates a logger bound to a named module.
 * The module name appears in every log line for easy filtering.
 */
export function createLogger(module: string): Logger {
  return {
    debug: (msg, ctx) => emit("debug", module, msg, undefined, ctx),
    info:  (msg, ctx) => emit("info",  module, msg, undefined, ctx),
    warn:  (msg, ctx) => emit("warn",  module, msg, undefined, ctx),
    error: (msg, err, ctx) => emit("error", module, msg, err, ctx),
  };
}

/**
 * Override the active log level at runtime (useful in tests).
 * Does not affect the LOG_LEVEL env var.
 */
export function setLogLevel(level: LogLevel): void {
  configuredLevel = level;
}
