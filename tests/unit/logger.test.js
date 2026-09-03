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

describe('sin console.* en src', () => {
  it('ningun archivo de src usa console directamente', () => {
    // Deliberadamente estricto: casa tambien dentro de comentarios, para que no
    // se acumulen `// console.log(...)` de depuracion. El unico permitido es el
    // propio logger, que es quien llama a console de verdad.
    const conConsole = walk('src')
      .filter(file => /\.(js|jsx|ts|tsx)$/.test(file))
      .filter(file => !file.endsWith(join('lib', 'logger.ts')))
      .filter(file => /console\.(log|error|warn|info)\s*\(/.test(readFileSync(file, 'utf8')));

    expect(conConsole).toEqual([]);
  });

  it('scripts/ si puede usar console: son herramientas de linea de comandos', () => {
    const conConsole = walk('scripts').filter(file =>
      /console\.(log|error)\s*\(/.test(readFileSync(file, 'utf8'))
    );

    expect(conConsole.length).toBeGreaterThan(0);
  });
});

describe('normalizacion del contexto', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it('convierte un Error en mensaje y stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    logger.error('fallo al guardar', new Error('conexión rechazada'));

    const [, context] = spy.mock.calls[0];
    expect(context.error).toBe('conexión rechazada');
    expect(context.stack).toContain('Error: conexión rechazada');
  });

  it('envuelve los valores que no son objeto', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    // Los sitios que venian de console.log('algo', valor) pasan strings y
    // numeros, no objetos.
    logger.error('id procesado', 'abc123');

    expect(spy.mock.calls[0][1]).toEqual({ detail: 'abc123' });
  });

  it('deja pasar los objetos tal cual', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.LOG_LEVEL = 'error';

    logger.error('rechazado', { status: 403, sellerId: 'xyz' });

    expect(spy.mock.calls[0][1]).toEqual({ status: 403, sellerId: 'xyz' });
  });
});
