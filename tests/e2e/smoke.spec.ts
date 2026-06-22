import { test, expect } from '@playwright/test';

test('app boots and lands on the Build screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Build' })).toBeVisible();
});
