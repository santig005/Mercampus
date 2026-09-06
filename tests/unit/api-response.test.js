import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { AppError } from '@/utils/lib/errors';

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
