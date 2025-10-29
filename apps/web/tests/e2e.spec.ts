import { test, expect } from '@playwright/test';

test('user enters play mode and views live multiplier', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /MemeCrash/i })).toBeVisible();
  await page.getByRole('link', { name: /Enter Play Mode/i }).click();
  await expect(page).toHaveURL(/play/);
  await expect(page.getByText(/Live Cash Out/i)).toBeVisible();
});
