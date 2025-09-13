import { test, expect } from '@playwright/test';

test('app loads home and shows header', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=FNOL Management')).toBeVisible();
});
