# T-172 — sidebar hamburger button overlapping "Antojitos"

Real renders for rule 3, produced by `tests/e2e/sidebar-hamburger-gap.spec.js`
against `next build` + an in-memory Mongo (the standard `npm run test:e2e`
harness). Playwright Chromium, `localStorage.theme` forced per shot.

## The bug

Reported by the human with a screenshot: opening the sidebar on `/antojos`
showed the hamburger button sitting on top of the "Antojitos" pill instead of
above it with a gap.

Root cause: `src/app/[locale]/antojos/layout.jsx` and `.../marketplace/
layout.jsx` (T-81) stack a `LocaleSwitcher` row above `<Layout>`'s own `h-16`
navbar row:

```jsx
<div className='drawer-content'>
  <div className='flex justify-end px-3 pt-2 sm:px-4 dark:bg-base-200'>
    <LocaleSwitcher />
  </div>
  <Layout>{children}</Layout>
</div>
```

That row measures 32px tall, so the hamburger button (inside `Navbar`, inside
`Layout`) no longer sits flush at the viewport's top the way it does on every
unmigrated page. `SideBar`'s own top padding (`pt-16` = 64px,
`src/components/seller/SideBar.jsx`) is sized for exactly one `h-16` row above
it and knows nothing about the extra row.

Measured live before the fix: hamburger button bottom edge at `y=88`, first
sidebar item top edge at `y=80` — an 8px overlap.

## The fix

`SideBar` takes an optional `topClassName` prop (default `'pt-16'`, so every
unmigrated layout — `src/app/antojos/layout.jsx`, `src/app/marketplace/
layout.jsx` — is untouched). The two `[locale]` layouts that stack the
`LocaleSwitcher` row pass `topClassName='pt-24'` (`pt-16` + the row's own
measured 32px), which clears the button with a 24px gap instead of an 8px
overlap.

This is a rendered-geometry bug, and the regression test reads real
`getBoundingClientRect()` values instead of a class name — the exact failure
mode T-100 shipped once already (a test that only checked a class string went
green on a render that was nearly invisible). A future change that
reintroduces the overlap — a taller switcher row, a shorter `SideBar` offset —
fails the geometry assertion regardless of which class caused it.

## Evidence

- `sidebar-gap__antojos__light.png` / `__dark.png`
- `sidebar-gap__marketplace__light.png` / `__dark.png`

All four show a clear gap between the hamburger button and the first sidebar
item. `tests/e2e/sidebar-hamburger-gap.spec.js` also covers
`/antojos/game` (an unmigrated page, no `LocaleSwitcher` row) as a control —
its gap is unchanged by this fix.
