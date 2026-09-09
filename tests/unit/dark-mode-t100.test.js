import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// T-100 (docs/audits/t-67/findings.md, F46 and F47). No live browser or
// server is exercised here (see the PR for why the usual before/after
// screenshots aren't attached this round) - these are source-level regression
// guards, same spirit as tests/unit/theme-tokens.test.js's T-75 scan, so a
// later edit that reintroduces either bug fails a fast, deterministic test
// instead of only showing up in a manual dark-mode check.

describe('T-100 · F47 - /antojos/sellers/approving responds to the theme', () => {
  const source = readFileSync(
    'src/app/antojos/sellers/approving/page.jsx',
    'utf8'
  );

  // The assertions below are about className strings, not prose - stripped so
  // a comment that has to *name* the class it warns against (see the one
  // above the card's div) can't trip its own regression guard.
  const codeOnly = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  it('no longer hardcodes the page/card hex colours the finding measured', () => {
    expect(codeOnly).not.toContain('#F2F2F2');
    expect(codeOnly).not.toContain('#FF7622');
  });

  it('the page background uses a daisyUI token, so data-theme reaches it', () => {
    expect(codeOnly).toContain('bg-base-200');
  });

  it('the card uses the same branded-orange class every other surface does, not `bg-primary`', () => {
    // Not a mistake, and not a partial fix: `bg-primary` is a real daisyUI
    // token, but public/css/main.css (line 62) overrides `.bg-primary` to
    // `bg-[#f8f8f8]` unconditionally, in both themes - the first version of
    // this fix used `bg-primary` and rendered a near-white card with white
    // text, illegible in light mode (worse than the bug F47 reported).
    // `bg-primary-orange` is the class every other branded-orange surface in
    // the app uses (Loading's spinner, ProfileChecklist's progress bar,
    // Carousel's active dot) - none of them differ by theme either, so this
    // matches the app's existing convention instead of inventing a new one.
    expect(codeOnly).toContain('bg-primary-orange');
    expect(codeOnly).not.toMatch(/\bbg-primary\b(?!-orange)/);
    // `text-primary-content` is the daisyUI content-token paired with the
    // real `bg-primary` - pairing it with a class that isn't a daisyUI token
    // would be a second, independent bug. `text-white` matches the rest of
    // the app's `bg-primary-orange` convention instead.
    expect(codeOnly).not.toContain('text-primary-content');
    expect(codeOnly).toContain('text-white');
  });
});

describe('T-100 · F46 - react-select reads the live theme', () => {
  const hook = readFileSync('src/utils/hooks/useReactSelectTheme.js', 'utf8');

  it('tracks data-theme instead of a one-time read, so a toggle updates it', () => {
    expect(hook).toContain('MutationObserver');
    expect(hook).toContain('data-theme');
  });

  it('exposes the styles prop react-select actually reads for these parts', () => {
    for (const part of ['control', 'menu', 'option', 'singleValue', 'multiValue']) {
      expect(hook).toContain(`${part}:`);
    }
  });

  for (const [file, importedFrom] of [
    ['src/app/antojos/product/add/page.jsx', '@/utils/hooks/useReactSelectTheme'],
    ['src/components/products/edit/EditProductForm.jsx', '@/utils/hooks/useReactSelectTheme'],
  ]) {
    it(`${file} wires every <Select> through the hook, not left plain white`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain(importedFrom);

      // Both the "Sección" and "Categoría" comboboxes are <Select> from
      // react-select (F46 named both) - every one of them must carry the
      // computed styles, not just the first.
      const selectBlocks = source.split(/<Select\b/).slice(1);
      expect(selectBlocks.length).toBeGreaterThanOrEqual(2);
      for (const block of selectBlocks) {
        // Every one of these <Select> elements is self-closing in these
        // files - cut at `/>`, not a bare `>`, which also matches the `=>`
        // inside each element's own onChange handler.
        const tag = block.slice(0, block.indexOf('/>'));
        expect(tag).toMatch(/styles=\{selectStyles\}/);
      }
    });
  }
});
