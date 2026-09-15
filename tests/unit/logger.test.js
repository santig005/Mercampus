import { logger } from '@/lib/logger';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';


const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it('prints nothing in test', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('no deberia verse');
    logger.info('no deberia verse');
    logger.warn('no deberia verse');
    logger.error('no deberia verse');

    // The tests provoke 401s, 403s and invalid payloads on purpose: that noise
    // used to bury the real failures in the output.
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('respects LOG_LEVEL when explicitly requested', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'warn';

    logger.debug('por debajo del umbral');
    logger.info('por debajo del umbral');
    logger.warn('esto si');
    logger.error('y esto');

    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('sends the context as a separate object, not interpolated', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    logger.error('fallo al guardar', { productId: 'abc123', status: 500 });

    expect(error).toHaveBeenCalledWith('[error] fallo al guardar', {
      productId: 'abc123',
      status: 500,
    });
  });
});

describe('no console.* in src', () => {
  it('no file in src uses console directly', () => {
    // Deliberately strict: it matches inside comments too, so a commented-out
    // se acumulen `// console.log(...)` de depuracion. El unico permitido es el
    // logger itself, which is the one that really calls console.
    const conConsole = walk('src')
      .filter(file => /\.(js|jsx|ts|tsx)$/.test(file))
      .filter(file => !file.endsWith(join('lib', 'logger.ts')))
      .filter(file => /console\.(log|error|warn|info)\s*\(/.test(readFileSync(file, 'utf8')));

    expect(conConsole).toEqual([]);
  });

  it('scripts/ may use console: they are command-line tools', () => {
    const conConsole = walk('scripts').filter(file =>
      /console\.(log|error)\s*\(/.test(readFileSync(file, 'utf8'))
    );

    expect(conConsole.length).toBeGreaterThan(0);
  });
});

describe('context normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it('converts an Error into message and stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    logger.error('fallo al guardar', new Error('conexión rechazada'));

    const [, context] = spy.mock.calls[0];
    expect(context.error).toBe('conexión rechazada');
    expect(context.stack).toContain('Error: conexión rechazada');
  });

  it('wraps values that are not an object', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    // The call sites that came from console.log('something', value) pass
    // numeros, no objetos.
    logger.error('id procesado', 'abc123');

    expect(spy.mock.calls[0][1]).toEqual({ detail: 'abc123' });
  });

  it('passes objects through as-is', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    logger.error('rechazado', { status: 403, sellerId: 'xyz' });

    expect(spy.mock.calls[0][1]).toEqual({ status: 403, sellerId: 'xyz' });
  });
});
