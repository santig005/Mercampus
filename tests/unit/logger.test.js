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

  it('no imprime nada en test', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('no deberia verse');
    logger.info('no deberia verse');
    logger.warn('no deberia verse');
    logger.error('no deberia verse');

    // Los tests provocan 401, 403 y payloads invalidos a proposito: ese ruido
    // tapaba los fallos de verdad en la salida.
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('respeta LOG_LEVEL cuando se pide explicitamente', () => {
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

  it('manda el contexto como objeto aparte, no interpolado', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    logger.error('fallo al guardar', { productId: 'abc123', status: 500 });

    expect(error).toHaveBeenCalledWith('[error] fallo al guardar', {
      productId: 'abc123',
      status: 500,
    });
  });
});

describe('sin console.* en las zonas ya migradas', () => {
  it('ni los handlers ni los componentes usan console directamente', () => {
    const conConsole = ['src/app/api', 'src/components', 'src/context']
      .flatMap(walk)
      .filter(file => /\.(js|jsx|ts|tsx)$/.test(file))
      .filter(file => /console\.(log|error|warn|info)\s*\(/.test(readFileSync(file, 'utf8')));

    expect(conConsole).toEqual([]);
  });
});
