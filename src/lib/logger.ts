import * as Sentry from '@sentry/nextjs';

type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const WEIGHT: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

// Prints nothing under test. The tests provoke errors on purpose - 401, 403,
// invalid payloads - and that noise buries the real failures in the output.
function configuredLevel(): Level {
  const explicit = process.env.LOG_LEVEL as Level | undefined;
  if (explicit && explicit in WEIGHT) return explicit;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return 'silent';
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const shouldLog = (level: Level) => WEIGHT[level] >= WEIGHT[configuredLevel()];

// The context goes as a separate object, not interpolated into the message:
// that way the message can be grouped and the context stays queryable once
// this reaches a log aggregator. In production it's also what ends up under
// `context` in the structured JSON line below, and in Sentry's `extra`.
type Context = Record<string, unknown>;

/**
 * Takes any value and turns it into an object.
 *
 * The call sites that came from `console.log('something', value)` pass errors,
 * strings or numbers, not objects. Rather than wrapping them by hand across
 * ~70 calls, they're normalised here: the log still comes out structured and
 * the `catch (error)` blocks - which are `unknown` in TS - need no casts.
 */
function normalize(context: unknown): Context | undefined {
  if (context === undefined || context === null) return undefined;

  if (context instanceof Error) {
    return { error: context.message, stack: context.stack };
  }

  if (typeof context === 'object' && !Array.isArray(context)) {
    return context as Context;
  }

  return { detail: context };
}

/**
 * T-60: error/warn also go to Sentry, but only when something upstream
 * actually called `Sentry.init()` (src/instrumentation.ts,
 * src/instrumentation-client.ts) - `Sentry.getClient()` is a plain read of
 * that module-level state, not a network call, so this is a no-op with no
 * DSN configured, which is every environment until T-60b. Takes the raw,
 * un-normalized context so an `Error` instance survives to reach
 * `captureException` instead of being flattened to a string first.
 */
function reportToSentry(level: 'warn' | 'error', message: string, context: unknown) {
  if (!Sentry.getClient()) return;

  if (level === 'warn') {
    Sentry.addBreadcrumb({ category: 'log', level: 'warning', message, data: normalize(context) });
    return;
  }

  if (context instanceof Error) {
    Sentry.captureException(context, { extra: { message } });
  } else {
    Sentry.captureMessage(message, { level: 'error', extra: normalize(context) });
  }
}

const emit = (level: Exclude<Level, 'silent'>, message: string, context?: unknown) => {
  if (!shouldLog(level)) return;

  if (level === 'warn' || level === 'error') {
    reportToSentry(level, message, context);
  }

  const normalized = normalize(context);
  const target = level === 'error' || level === 'warn' ? console.error : console.log;

  // Vercel's log search parses one JSON object per line and indexes its
  // fields; the readable `[level] message` form below is for a human
  // reading `next dev`'s terminal, who doesn't want to parse JSON by eye.
  if (process.env.NODE_ENV === 'production') {
    target(
      JSON.stringify({
        level,
        message,
        context: normalized ?? null,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  const line = `[${level}] ${message}`;
  if (normalized) {
    target(line, normalized);
  } else {
    target(line);
  }
};

export const logger = {
  debug: (message: string, context?: unknown) => emit('debug', message, context),
  info: (message: string, context?: unknown) => emit('info', message, context),
  warn: (message: string, context?: unknown) => emit('warn', message, context),
  error: (message: string, context?: unknown) => emit('error', message, context),
};
