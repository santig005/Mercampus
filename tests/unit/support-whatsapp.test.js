import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SUPPORT_WHATSAPP_NUMBER, supportWhatsAppUrl } from '@/utils/resources/support';

// T-159: the support number was hardcoded in three pages as two different
// numbers. It now lives in one constant; this keeps a fourth copy from
// appearing. Sellers' own numbers (seller.phoneNumber) are interpolated, not
// literal, so they do not match.

const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const componentFiles = [...walk('src/app'), ...walk('src/components')].filter(file =>
  /\.(js|jsx|ts|tsx)$/.test(file)
);

describe('support WhatsApp number', () => {
  it('no page or component hardcodes a phone number in a wa.me link', () => {
    // Both forms the old code used: wa.me/573197139921 and
    // wa.me/+57${encodeURIComponent(3054213899)}. `\d{10,}` rather than `\d`
    // so the sellers' wa.me/+57${seller.phoneNumber} links do not match.
    const literal = /wa\.me\/(\+?\d{10,}|\+57\$\{encodeURIComponent\(\d)/;
    const offenders = componentFiles.filter(file => literal.test(readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('is the number the human confirmed, in the form wa.me expects', () => {
    expect(SUPPORT_WHATSAPP_NUMBER).toBe('573054213899');
  });

  it('builds the link with the message encoded', () => {
    expect(supportWhatsAppUrl('Hola & chao')).toBe(
      'https://wa.me/573054213899?text=Hola%20%26%20chao'
    );
  });
});
