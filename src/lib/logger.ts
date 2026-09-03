type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const WEIGHT: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

// En test no imprime nada. Los tests provocan errores a proposito —401, 403,
// payloads invalidos— y ese ruido tapa los fallos de verdad en la salida.
function configuredLevel(): Level {
  const explicit = process.env.LOG_LEVEL as Level | undefined;
  if (explicit && explicit in WEIGHT) return explicit;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return 'silent';
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const shouldLog = (level: Level) => WEIGHT[level] >= WEIGHT[configuredLevel()];

// El contexto va como objeto aparte, no interpolado en el mensaje: asi el
// mensaje se puede agrupar y el contexto sigue siendo consultable cuando esto
// vaya a un agregador de logs (T-60).
type Context = Record<string, unknown>;

const emit = (level: Exclude<Level, 'silent'>, message: string, context?: Context) => {
  if (!shouldLog(level)) return;

  const line = `[${level}] ${message}`;
  const target = level === 'error' || level === 'warn' ? console.error : console.log;

  if (context) {
    target(line, context);
  } else {
    target(line);
  }
};

export const logger = {
  debug: (message: string, context?: Context) => emit('debug', message, context),
  info: (message: string, context?: Context) => emit('info', message, context),
  warn: (message: string, context?: Context) => emit('warn', message, context),
  error: (message: string, context?: Context) => emit('error', message, context),
};
