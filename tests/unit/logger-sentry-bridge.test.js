import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// T-60: `logger.ts` imports `* as Sentry from '@sentry/nextjs'` at module
// scope (the pattern Sentry's own docs use for shared code reachable from
// both client and server bundles) - mocked here so the assertions below
// don't depend on whether a real Sentry client happens to exist, and so no
// real Sentry call is ever made from this suite.
vi.mock('@sentry/nextjs', () => ({
  getClient: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

const Sentry = await import('@sentry/nextjs');
const { logger } = await import('@/lib/logger');

describe('logger -> Sentry bridge', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.LOG_LEVEL;
  });

  it('reports nothing when Sentry was never initialized', () => {
    Sentry.getClient.mockReturnValue(undefined);
    process.env.LOG_LEVEL = 'error';

    logger.error('fallo al guardar', new Error('conexión rechazada'));
    logger.warn('reintentando');

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('captureException when the context is an Error, once Sentry is initialized', () => {
    Sentry.getClient.mockReturnValue({});
    process.env.LOG_LEVEL = 'error';
    const error = new Error('conexión rechazada');

    logger.error('fallo al guardar', error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.anything());
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('captureMessage when the context is not an Error', () => {
    Sentry.getClient.mockReturnValue({});
    process.env.LOG_LEVEL = 'error';

    logger.error('rechazado', { status: 403, sellerId: 'xyz' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('rechazado', expect.anything());
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('captureMessage when there is no context at all', () => {
    Sentry.getClient.mockReturnValue({});
    process.env.LOG_LEVEL = 'error';

    logger.error('algo falló sin más detalle');

    expect(Sentry.captureMessage).toHaveBeenCalledWith('algo falló sin más detalle', expect.anything());
  });

  it('warn adds a breadcrumb instead of capturing an event', () => {
    Sentry.getClient.mockReturnValue({});
    process.env.LOG_LEVEL = 'warn';

    logger.warn('reintentando', { attempt: 2 });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('debug and info never reach Sentry, initialized or not', () => {
    Sentry.getClient.mockReturnValue({});
    process.env.LOG_LEVEL = 'debug';

    logger.debug('detalle');
    logger.info('informativo');

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('a level below the configured threshold never reaches Sentry either', () => {
    Sentry.getClient.mockReturnValue({});
    process.env.LOG_LEVEL = 'error';

    logger.warn('por debajo del umbral');

    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
  });
});
