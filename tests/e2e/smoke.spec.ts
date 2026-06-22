import { test, expect } from '@playwright/test';

test('app boots and lands on the Build screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('Search remedies…')).toBeVisible();
});
