import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getImageKit } from '@/utils/imagekit';
import { ConfigError } from '@/utils/lib/errors';

// T-113: T-11b renamed these three variables in code and never in Vercel.
// The SDK ended up constructed with three `undefined`s, every upload
// answered a generic 500, and the cause lived only in a Vercel log nobody
// was reading. These tests pin the fix: a missing variable is named, not
// swallowed, and surfaces as a ConfigError so the route can tell the caller
// this isn't worth retrying.
describe('getImageKit · required env vars', () => {
  const REQUIRED = ['IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'];
  const original = {};

  beforeEach(() => {
    for (const name of REQUIRED) {
      original[name] = process.env[name];
      process.env[name] = `test-${name}`;
    }
  });

  afterEach(() => {
    for (const name of REQUIRED) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  it.each(REQUIRED)('throws a ConfigError naming %s when it is the only one missing', name => {
    delete process.env[name];

    expect(() => getImageKit()).toThrow(ConfigError);
    expect(() => getImageKit()).toThrow(name);
  });

  it('names every missing variable when none are set', () => {
    for (const name of REQUIRED) delete process.env[name];

    let thrown;
    try {
      getImageKit();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConfigError);
    for (const name of REQUIRED) {
      expect(thrown.message).toContain(name);
    }
  });
});
