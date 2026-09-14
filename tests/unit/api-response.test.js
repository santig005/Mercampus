import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { AppError, ConfigError } from '@/utils/lib/errors';

// T-65. A 401/403 is an expected client-side rejection, not a server
// failure: it shouldn't compete for attention with real 500s in the Vercel
// logs.
describe('errorResponse · log level based on status', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs an expected 401 as warn, not error', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(new AppError('No autenticado.', 401), '[test]');

    expect(response.status).toBe(401);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('logs an expected 403 as warn, not error', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(new AppError('No autorizado.', 403), '[test]');

    expect(response.status).toBe(403);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('an unexpected failure (500) still goes to error', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(new Error('conexión rechazada'), '[test]');

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a 500 never leaks its internal message to the client', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(
      new Error('Mongo timeout en coleccion sellers'),
      '[test]'
    );

    const body = await response.json();
    expect(body.error).toBe('Error interno del servidor');
  });
});

// T-126. The imagekit SDK rejects a failed upload with a plain object
// (`{ message, help }`), not an `Error`, so the real reason used to be
// dropped before it reached the log - only the generic 500 message showed
// up server-side too.
describe('errorResponse · a plain-object rejection still logs its reason', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the message and help of a non-Error rejection', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(
      {
        message: 'Invalid file uploaded',
        help: 'Ensure the file is a valid image.',
      },
      '[test]'
    );

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledTimes(1);
    const [, context] = error.mock.calls[0];
    expect(context.detailMessage).toBe('Invalid file uploaded');
    expect(context.help).toBe('Ensure the file is a valid image.');
  });

  it('still never leaks the plain-object detail to the client', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(
      { message: 'Invalid file uploaded', help: 'Ensure the file is a valid image.' },
      '[test]'
    );

    const body = await response.json();
    expect(body.error).toBe('Error interno del servidor');
  });
});

// T-113: a missing env var isn't a transient failure like the Mongo timeout
// above - retrying does nothing until a human sets it in Vercel. The
// response has to say so instead of the generic 500 text, which reads as
// "try again".
describe('errorResponse · ConfigError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a ConfigError as error, naming the missing variable', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});

    errorResponse(new ConfigError('ImageKit no está configurado: falta IMAGEKIT_PRIVATE_KEY.'), '[test]');

    expect(error).toHaveBeenCalledTimes(1);
    const [, context] = error.mock.calls[0];
    expect(context.message).toContain('IMAGEKIT_PRIVATE_KEY');
  });

  it('answers with a configuration message, not the generic 500 text', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});

    const response = errorResponse(
      new ConfigError('ImageKit no está configurado: falta IMAGEKIT_PRIVATE_KEY.'),
      '[test]'
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toBe('Error interno del servidor');
    expect(body.error.toLowerCase()).toContain('configuración');
    // The specific variable name stays in the log, not in the response.
    expect(body.error).not.toContain('IMAGEKIT_PRIVATE_KEY');
  });
});
