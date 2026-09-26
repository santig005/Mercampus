import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/lib/metadata';
import { buildOrganizationJsonLd, serializeJsonLd } from '@/lib/structured-data';

// T-152c. The full object, written out: a change to the emitted markup has to
// show up in this file's diff, not slip through a looser assertion.
describe('buildOrganizationJsonLd', () => {
  it('emits exactly this Organization', () => {
    expect(buildOrganizationJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Mercampus',
      url: 'https://mercampus.vercel.app/',
      logo: 'https://mercampus.vercel.app/images/logo.png',
      sameAs: ['https://www.instagram.com/mercampus/'],
    });
  });

  it('builds every URL on the canonical origin', () => {
    const { url, logo } = buildOrganizationJsonLd();
    expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
    expect(logo.startsWith(`${SITE_URL}/`)).toBe(true);
  });
});

describe('serializeJsonLd', () => {
  it('round-trips through JSON.parse', () => {
    const data = buildOrganizationJsonLd();
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  // A value containing "</script>" must not be able to close the tag it is
  // rendered into.
  it('escapes "<" so a value cannot end the <script> tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });

    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });
});
