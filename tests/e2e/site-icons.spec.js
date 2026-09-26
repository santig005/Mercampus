import { expect, test } from '@playwright/test';

// T-162: five icons the root layout declared - including the Open Graph image
// every non-product link previewed with - answered 404 in production. This
// reads what the rendered <head> actually declares and requests each one, so
// it keeps checking whatever the metadata points at, not a list copied here.

for (const path of ['/', '/antojos']) {
  test(`${path}: every declared icon and the og:image are served`, async ({
    page,
    request,
  }) => {
    await page.goto(path);

    const { icons, ogImages } = await page.evaluate(() => ({
      icons: [
        ...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'),
      ].map(link => link.getAttribute('href')),
      ogImages: [...document.querySelectorAll('meta[property="og:image"]')].map(meta =>
        meta.getAttribute('content')
      ),
    }));

    // Both kinds must be declared at all, or the loop below passes on nothing.
    expect(icons.length).toBeGreaterThan(0);
    expect(ogImages.length).toBeGreaterThan(0);

    for (const url of [...icons, ...ogImages]) {
      // og:image is absolute on the production origin (metadataBase); request
      // the same path from this build.
      const response = await request.get(new URL(url, 'http://x').pathname);
      expect(response.status(), url).toBe(200);
    }
  });
}
