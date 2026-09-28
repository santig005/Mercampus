import { expect, test } from '@playwright/test';

// T-172. Reported by the human with a screenshot: on /antojos, opening the
// sidebar showed the hamburger button sitting on top of the "Antojitos"
// pill instead of above it with a gap.
//
// Root cause: src/app/[locale]/antojos/layout.jsx and .../marketplace/
// layout.jsx (T-81) stack a LocaleSwitcher row above <Layout>'s own h-16
// navbar row, so the hamburger button (inside Navbar, inside Layout) no
// longer sits flush at the viewport's top the way it does on every
// unmigrated page. SideBar's own top padding (pt-16, src/components/seller/
// SideBar.jsx) is sized for exactly one h-16 row above it - unaware of the
// extra row, it left the sidebar's own content starting 8px above where the
// hamburger's bottom edge actually was (measured live: hamburger bottom at
// y=88, first sidebar item at y=80).
//
// This is a rendered-geometry bug (rule 3, and the exact failure mode T-100
// shipped once already: a passing test that only reads a class string can go
// green on a broken render). The assertion below reads real
// getBoundingClientRect() values from the live page instead of any class
// name, so a future change that reintroduces the overlap - a taller locale
// switcher row, a shorter SideBar offset - fails here regardless of which
// class caused it.
// Two elements share htmlFor='my-dibujador': this button (Hambtn.jsx) and
// the drawer's own close overlay (SideBar.jsx, aria-label="close sidebar").
// The btn-circle class is what tells them apart.
const HAMBURGER = 'label.btn-circle[for="my-dibujador"]';

async function measureGap(page) {
  await page.locator(HAMBURGER).click();
  const sidebarFirstItem = page.locator('.drawer-side ul li').first();
  await expect(sidebarFirstItem).toBeVisible();

  return page.evaluate(
    ([hamburgerSelector]) => {
      const hamburger = document.querySelector(hamburgerSelector);
      const firstItem = document.querySelector('.drawer-side ul li');
      return (
        firstItem.getBoundingClientRect().top -
        hamburger.getBoundingClientRect().bottom
      );
    },
    [HAMBURGER]
  );
}

test.describe('the sidebar hamburger button does not overlap the menu (T-172)', () => {
  for (const theme of ['light', 'dark']) {
    for (const [label, path] of [
      ['antojos', '/antojos'],
      ['marketplace', '/marketplace'],
    ]) {
      test(`${label} (${theme}): a real gap separates the button from "Antojitos"`, async ({
        page,
      }) => {
        if (theme === 'dark') {
          await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
        }

        await page.goto(path);
        const gap = await measureGap(page);

        // Not just "not negative" (that would pass at 0px, still touching) -
        // a real, visible gap. 8px is comfortably less than the 24px this
        // fix produces and comfortably more than the -8px the bug measured.
        expect(gap, 'gap between the hamburger button and the first sidebar item').toBeGreaterThanOrEqual(8);

        await page.screenshot({
          path: `docs/audits/t-172/sidebar-gap__${label}__${theme}.png`,
        });
      });
    }
  }

  // The control: an unmigrated page has no extra row above the navbar, so
  // SideBar's default pt-16 (unchanged for every caller that doesn't pass
  // topClassName) must still be exactly right here - this fix must not have
  // shifted the pages it was never about.
  test('an unmigrated page (antojos/game) keeps its original spacing', async ({ page }) => {
    await page.goto('/antojos/game');
    const gap = await measureGap(page);

    expect(gap, 'gap on a page with no locale-switcher row above the navbar').toBeGreaterThanOrEqual(8);
  });
});
