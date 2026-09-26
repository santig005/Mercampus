import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { APP_HOME } from '@/lib/app-home';

// T-152b: '/' is becoming the public landing page. Every "send them home"
// in the app meant the catalogue and only got there through the old
// '/' -> /antojos redirect, so they now say APP_HOME. This keeps a new one
// from quietly pointing at the landing instead.

const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

// Commented-out code does not navigate anywhere (several forms keep an old
// `<Link href='/'>` inside {/* */}), so comments are stripped first.
const withoutComments = source =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const ROOT_AS_HOME = [
  /router\.(push|replace)\(\s*['"`]\/['"`]\s*\)/,
  /\bhref=['"]\/['"]/,
  /\bhref=\{\s*['"`]\/['"`]\s*\}/,
  /redirectUrlComplete:\s*['"`]\/['"`]/,
  /new URL\(\s*['"`]\/['"`]\s*,/,
];

describe('APP_HOME (T-152b)', () => {
  it('is the catalogue', () => {
    expect(APP_HOME).toBe('/antojos');
  });

  it('no navigation in src/ sends users to the bare root', () => {
    const files = walk('src').filter(file => /\.(js|jsx|ts|tsx)$/.test(file));
    const offenders = files.filter(file => {
      const source = withoutComments(readFileSync(file, 'utf8'));
      return ROOT_AS_HOME.some(pattern => pattern.test(source));
    });

    expect(offenders).toEqual([]);
  });
});
