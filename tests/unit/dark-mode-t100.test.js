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

  it('no longer hardcodes the page/card hex colours the finding measured', () => {
    expect(source).not.toContain('#F2F2F2');
    expect(source).not.toContain('#FF7622');
  });

  it('uses daisyUI tokens instead, so data-theme reaches it', () => {
    expect(source).toContain('bg-base-200');
    expect(source).toContain('bg-primary');
    expect(source).toContain('text-primary-content');
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
