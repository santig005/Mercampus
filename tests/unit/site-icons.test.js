import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SITE_ICONS, SITE_OG_IMAGE } from '@/lib/metadata';

// T-162: the root layout declared five icon files that were never added to
// public/, one of them the site-wide share image - all 404 in production.
// Every path the layout declares must be a file that ships.
const declaredPaths = [
  ...SITE_ICONS.icon.map(icon => icon.url),
  SITE_ICONS.shortcut,
  SITE_ICONS.apple,
  SITE_OG_IMAGE.url,
];

describe('site icons and share image (T-162)', () => {
  it.each(declaredPaths)('%s exists in public/', path => {
    expect(existsSync(join('public', path))).toBe(true);
  });

  // manifest.json lists its own icons; they must exist too.
  it('every icon in manifest.json exists in public/', async () => {
    const { default: manifest } = await import('../../public/manifest.json');
    for (const icon of manifest.icons) {
      expect(existsSync(join('public', icon.src))).toBe(true);
    }
  });
});
