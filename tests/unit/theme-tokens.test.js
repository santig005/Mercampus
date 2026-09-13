import { readdirSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';

import { describe, expect, it } from 'vitest';

// T-75. The dark theme only works where the app uses daisyUI's tokens instead
// of hardcoded Tailwind colours, and nothing else catches a regression here:
// the light theme renders a stray `bg-white` identically, so it looks fine in
// review, in the tests and in CI, and only breaks for someone browsing in
// dark mode. This scan is the guard.
//
// The rule the migration followed (see the T-75 entry in ROADMAP.md):
//  - surfaces and borders are REPLACED by tokens, so any leftover is a miss;
//  - text greys KEEP their light class and gain a `dark:` companion, so only
//    an uncompanioned one is a miss.
const UNMIGRATED_TEXT = /\b(?<!dark:)(text-black|text-gray-\d+)\b(?!\s+dark:)/g;
const UNMIGRATED_SURFACE =
  /\b(?<!dark:)(bg-white(?!\/)|bg-gray-(?:50|100|200)|border-gray-\d+)\b/g;

// `bg-white/10` and friends are opacity over a coloured surface, not a
// themeable surface - hence the (?!\/) above. Greys outside the ranges here
// (bg-gray-400 dots, bg-gray-800/900 blocks, text-gray-200 on a colour) are
// self-consistent pairs that read correctly on either theme; see ROADMAP.

// Deliberate exceptions, each argued in the PR that introduced it. A new entry
// here should come with a reason, not just a path.
const ALLOWED = [
  {
    file: 'src/app/[locale]/about/page.jsx',
    classes: ['bg-white', 'bg-gray-100'],
    reason:
      'CTA button on the orange band: white IS the contrast colour there, ' +
      'not a surface. Tokenising it darkens the button while the band stays ' +
      'bg-orange-500.',
  },
  {
    file: 'src/app/[locale]/about/page.jsx',
    classes: ['text-gray-400'],
    reason: 'Footer text inside a self-contained bg-gray-900 block.',
  },
  {
    file: 'src/components/products/share/ShareButton.jsx',
    classes: ['text-gray-200'],
    reason: 'Sits on !bg-green-600 - a self-consistent pair on either theme.',
  },
];

// Comments mention these class names when explaining why they are there
// (about/page.jsx and card-variant.js both do). Stripping them keeps the scan
// about code, without having to allowlist a whole file over a comment.
function stripComments(source) {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

// readdirSync({ recursive: true }) rather than a glob package: the obvious one
// (fast-glob) is only a transitive dependency here, and this needs no new
// direct one.
function sourceFiles() {
  return readdirSync('src', { recursive: true, encoding: 'utf8' })
    .map(entry => `src/${entry.split(sep).join('/')}`)
    .filter(file => /\.(js|jsx|ts|tsx)$/.test(file));
}

function scan() {
  const hits = [];

  for (const file of sourceFiles()) {
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const regex of [UNMIGRATED_TEXT, UNMIGRATED_SURFACE]) {
      for (const match of source.matchAll(regex)) {
        hits.push({ file, className: match[0] });
      }
    }
  }
  return hits;
}

const isAllowed = hit =>
  ALLOWED.some(
    entry => entry.file === hit.file && entry.classes.includes(hit.className)
  );

describe('T-75 · tokens de tema en toda la app', () => {
  it('no queda ninguna clase sin migrar fuera de las excepciones documentadas', () => {
    const unexpected = scan().filter(hit => !isAllowed(hit));

    // The message lists file and class: if this fails it says exactly what to
    // migrate, not just that something broke.
    expect(
      unexpected.map(hit => `${hit.file}: ${hit.className}`),
      'clases sin migrar (ver la regla de T-75 en ROADMAP.md)'
    ).toEqual([]);
  });

  it('cada excepcion sigue existiendo: si se migro, sobra en la lista', () => {
    const hits = scan();

    for (const entry of ALLOWED) {
      for (const className of entry.classes) {
        expect(
          hits.some(hit => hit.file === entry.file && hit.className === className),
          `${entry.file} ya no usa ${className}: borra esa excepcion de ALLOWED`
        ).toBe(true);
      }
    }
  });
});
