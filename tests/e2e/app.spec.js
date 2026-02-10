const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE_URL = `file://${path.resolve(__dirname, '../../dist/index.html')}`;

test('page loads without console errors and Alpine.js initializes', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(PAGE_URL, { waitUntil: 'load' });

  // Wait for Alpine.js to hydrate x-data
  await page.waitForFunction(() => {
    const el = document.querySelector('[x-data]');
    return el && (el.__x !== undefined || el._x_dataStack !== undefined);
  }, { timeout: 5000 });

  // No console errors
  expect(errors).toEqual([]);

  // Alpine.js data stack is present
  const hasAlpineData = await page.evaluate(() => {
    const el = document.querySelector('[x-data]');
    return el && (el.__x !== undefined || el._x_dataStack !== undefined);
  });
  expect(hasAlpineData).toBe(true);

  // Repository section is visible
  await expect(page.locator('.repository-row')).toBeVisible();
});
