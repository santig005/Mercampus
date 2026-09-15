import { expect, test } from '@playwright/test';

// Besides the 3 normal antojos, scripts/e2e.mjs plants 15 products named
// "Antojo de scroll N" with availability:false and a deliberately old
// createdAt: they sort after the original 3 (availability desc, createdAt
// desc), so they end up split between the first page (PAGE_SIZE=12 in
// ProductGrid.jsx) and the second. The final tie-break is _id desc, and the
// insertMany() calls generate increasing ids in the array's own order, so
// "scroll 1" (inserted first, the smallest id among the filler) is one of
// the last to be seen - it should only appear after loading the second
// page.
test.describe('scroll infinito en el listado (T-23)', () => {
  test('cargar mas al llegar al final trae la siguiente pagina', async ({ page }) => {
    // T-110: found while stabilising the suite - T-123's bug (page 2
    // auto-loading ~300ms after the first page rendered, with nobody
    // scrolling: ProductGrid.jsx's sentinel firing before auto-animate's
    // enter transition settled) went unseen here because `toHaveCount(0)`
    // below passed on its very first poll. It never actually watched for the
    // request; it just happened to check before it landed. Record every
    // request to /api/products up front so the assertion after networkidle
    // can tell whether one carrying `cursor` (page 2) ever fired.
    const cursorRequests = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname === '/api/products' && url.searchParams.has('cursor')) {
        cursorRequests.push(url.toString());
      }
    });

    await page.goto('/antojos');

    // Before scrolling: the original 3 antojos are still on the first page
    // (the filler did not push them off), and the "oldest" filler of the batch
    // todavia no deberia estar.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();

    // The real condition: give the page's own network activity a chance to
    // genuinely go quiet - which spans the enter-animation window the old bug
    // lived in - before trusting that no page-2 request snuck in. Not a fixed
    // sleep: this resolves as soon as the page is actually idle, and keeps
    // waiting if it is not.
    await page.waitForLoadState('networkidle');
    expect(cursorRequests, 'a cursor= request fired before any scroll').toHaveLength(0);
    await expect(page.getByText('Antojo de scroll 1', { exact: true })).toHaveCount(0);

    await page.screenshot({ path: 'test-results/06-scroll-antes.png', fullPage: true });

    // El listado no scrollea la ventana: vive dentro de un contenedor propio
    // with overflow-y-scroll (Layout.jsx), so window.scrollTo moves nothing
    // nada. scrollIntoViewIfNeeded encuentra el contenedor real y dispara el
    // the sentinel's IntersectionObserver at the end of the list.
    await page.getByText('Antojo de scroll 7', { exact: true }).scrollIntoViewIfNeeded();

    await expect(page.getByText('Antojo de scroll 1', { exact: true })).toBeVisible();
    // Sanity check on the check above: page 2 really did require the scroll.
    expect(cursorRequests.length).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/07-scroll-despues.png', fullPage: true });
  });
});
