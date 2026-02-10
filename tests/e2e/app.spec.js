const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE_URL = `file://${path.resolve(__dirname, '../../dist/index.html')}`;

// Helper: go to the page and wait for Alpine to initialize
async function loadApp(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(PAGE_URL, { waitUntil: 'load' });
  // Wait for Alpine.js to hydrate x-data
  await page.waitForFunction(() => {
    const el = document.querySelector('[x-data]');
    return el && el.__x !== undefined || el._x_dataStack !== undefined;
  }, { timeout: 5000 });

  return errors;
}

// ---------- 1. App initialization ----------
test.describe('App initialization', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors = await loadApp(page);
    expect(errors).toEqual([]);
  });

  test('Alpine.js initializes successfully', async ({ page }) => {
    await loadApp(page);
    const hasAlpineData = await page.evaluate(() => {
      const el = document.querySelector('[x-data]');
      return el && (el.__x !== undefined || el._x_dataStack !== undefined);
    });
    expect(hasAlpineData).toBe(true);
  });

  test('repository section is visible', async ({ page }) => {
    await loadApp(page);
    await expect(page.locator('.repository-row')).toBeVisible();
  });
});

// ---------- 2. Character CRUD ----------
test.describe('Character CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const el = document.querySelector('[x-data]');
      return el && (el.__x !== undefined || el._x_dataStack !== undefined);
    }, { timeout: 5000 });
  });

  test('create a character and see it in repository', async ({ page }) => {
    // Fill name
    await page.fill('input[x-model="charName"]', '測試角色');

    // Select a job (first checkbox in the job group)
    const jobCheckbox = page.locator('.checkbox-group input[x-model="selectedJobs"]').first();
    await jobCheckbox.check({ force: true });

    // Click save
    await page.click('#addChar');

    // Character should appear in repo
    const repoCards = page.locator('.repository-row .card');
    await expect(repoCards).toHaveCount(1);
    await expect(repoCards.first().locator('strong')).toHaveText('測試角色');
  });

  test('edit a character', async ({ page }) => {
    // Create a character first
    await page.fill('input[x-model="charName"]', '原始名稱');
    await page.locator('.checkbox-group input[x-model="selectedJobs"]').first().check({ force: true });
    await page.click('#addChar');

    // Click edit button on the card
    await page.locator('.repository-row .card .icon-btn').first().click();

    // Form should have the character's name
    await expect(page.locator('input[x-model="charName"]')).toHaveValue('原始名稱');

    // Change name and save
    await page.fill('input[x-model="charName"]', '修改後名稱');
    await page.click('#addChar');

    // Card should show updated name
    await expect(page.locator('.repository-row .card strong').first()).toHaveText('修改後名稱');
  });

  test('delete a character', async ({ page }) => {
    // Create a character
    await page.fill('input[x-model="charName"]', '要刪除的角色');
    await page.locator('.checkbox-group input[x-model="selectedJobs"]').first().check({ force: true });
    await page.click('#addChar');
    await expect(page.locator('.repository-row .card')).toHaveCount(1);

    // Accept the confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Click delete button (second icon-btn)
    await page.locator('.repository-row .card .icon-btn').nth(1).click();

    // Card should be gone
    await expect(page.locator('.repository-row .card')).toHaveCount(0);
  });
});

// ---------- 3. localStorage persistence ----------
test.describe('localStorage persistence', () => {
  test('character persists after reload', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const el = document.querySelector('[x-data]');
      return el && (el.__x !== undefined || el._x_dataStack !== undefined);
    }, { timeout: 5000 });

    // Create a character
    await page.fill('input[x-model="charName"]', '持久角色');
    await page.locator('.checkbox-group input[x-model="selectedJobs"]').first().check({ force: true });
    await page.click('#addChar');
    await expect(page.locator('.repository-row .card')).toHaveCount(1);

    // Reload
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const el = document.querySelector('[x-data]');
      return el && (el.__x !== undefined || el._x_dataStack !== undefined);
    }, { timeout: 5000 });

    // Character should still be there
    await expect(page.locator('.repository-row .card')).toHaveCount(1);
    await expect(page.locator('.repository-row .card strong').first()).toHaveText('持久角色');
  });
});

// ---------- 4. Team settings ----------
test.describe('Team settings', () => {
  test('toggle team visibility hides the team column', async ({ page }) => {
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const el = document.querySelector('[x-data]');
      return el && (el.__x !== undefined || el._x_dataStack !== undefined);
    }, { timeout: 5000 });

    // All team columns should be visible initially
    const teamColumns = page.locator('.board > .column');
    const initialCount = await teamColumns.count();
    expect(initialCount).toBeGreaterThan(0);

    // Open settings
    await page.click('button:has-text("設定")');

    // Uncheck first team checkbox in settings panel
    const settingsCheckbox = page.locator('div[x-show="showSettings"] input[type="checkbox"]').first();
    await settingsCheckbox.uncheck({ force: true });

    // One fewer visible team column
    const visibleColumns = page.locator('.board > .column:visible');
    await expect(visibleColumns).toHaveCount(initialCount - 1);
  });
});
