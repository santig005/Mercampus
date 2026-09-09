import { expect, test } from '@playwright/test';

// T-101. F42 measured the schedule row on a 390x844 viewport: the row's
// content was 411px wide packed into a ~279px box, and the second time
// input ("Hora Final") landed at x=311-467 - 77px past the 390px edge -
// inside a container whose computed overflow-x is hidden (Layout.jsx's
// hide-scrollbar scroller). There is no horizontal scroll to reach it, so
// this pins the field's bounding box to the viewport at the same width the
// audit used.
test.describe('schedule row on mobile (T-101, F42)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the end time input stays inside the viewport', async ({ page }) => {
    await page.goto('/antojos/sellers/schedules');
    await expect(page).not.toHaveURL(/auth\/login/);

    // Schedule.jsx does not wire the label to the input with htmlFor/id (F41's
    // sibling problem, left alone here - out of scope for F42), so this reaches
    // it the way the audit did: by the label text next to it, not by role.
    const endTimeInput = page
      .locator('label:has-text("Hora Final") + input[type="time"]')
      .first();
    await expect(endTimeInput).toBeVisible();

    const box = await endTimeInput.boundingBox();
    expect(box).not.toBeNull();

    const viewportWidth = page.viewportSize().width;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth);
  });
});
