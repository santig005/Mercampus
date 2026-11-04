import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from '@/lib/sentry';

// CLAUDE.md rule 6: no secret, no PII leaves this app. sendDefaultPii:false
// (src/lib/sentry.ts) already stops most of this from ever reaching the
// event, but a dependency (Clerk's own instrumentation, a future SDK
// update) could still attach it - this is the last line of defense, so it
// has to work against the event even if the fields below were never
// supposed to be there.
describe('scrubSentryEvent', () => {
  it('drops the request body', () => {
    const event = { request: { url: '/api/sellers', data: { businessName: 'Arepas Ana' } } };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request).not.toHaveProperty('data');
    expect(scrubbed.request.url).toBe('/api/sellers');
  });

  it('drops cookies', () => {
    const event = { request: { url: '/antojos', cookies: { __session: 'abc' } } };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request).not.toHaveProperty('cookies');
  });

  it('drops the Authorization and Cookie headers, case-insensitively', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer secret',
          cookie: '__session=abc',
          'Content-Type': 'application/json',
        },
      },
    };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request.headers).not.toHaveProperty('Authorization');
    expect(scrubbed.request.headers).not.toHaveProperty('cookie');
    expect(scrubbed.request.headers['Content-Type']).toBe('application/json');
  });

  it('never sends an email or a phone number', () => {
    const event = {
      user: { id: 'user_abc123', email: 'ana@uni.edu', phone: '3001234567' },
    };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.user).not.toHaveProperty('email');
    expect(scrubbed.user).not.toHaveProperty('phone');
    expect(scrubbed.user.id).toBe('user_abc123');
  });

  it('leaves the rest of the event untouched', () => {
    const event = { message: 'algo falló', level: 'error', tags: { seller: 'xyz' } };

    expect(scrubSentryEvent(event)).toEqual(event);
  });

  it('tolerates a request/user with no sensitive fields at all', () => {
    const event = { request: { url: '/antojos' }, user: { id: 'user_abc123' } };

    expect(scrubSentryEvent(event)).toEqual(event);
  });

  it('tolerates an event with neither request nor user', () => {
    const event = { message: 'algo falló' };

    expect(scrubSentryEvent(event)).toEqual(event);
  });
});
