import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the dashboard and shows sidebar', async ({ page }) => {
    await expect(page.locator('text=STELLAR')).toBeVisible();
    await expect(page.locator('text=DEV DASHBOARD')).toBeVisible();
  });

  test('network toggle switches between testnet and mainnet', async ({ page }) => {
    const mainBtn = page.locator('button', { hasText: 'Main' });
    await mainBtn.click();
    await expect(mainBtn).toHaveCSS('color', /0, 229, 255/); // cyan active color
  });

  test('clicking Multisig nav item shows multisig page', async ({ page }) => {
    await page.locator('button', { hasText: 'Multisig' }).click();
    await expect(page.locator('text=Multi-Signature')).toBeVisible();
  });

  test('clicking Overview nav item shows overview page', async ({ page }) => {
    await page.locator('button', { hasText: 'Overview' }).click();
    await expect(page.locator('text=Overview')).toBeVisible();
  });
});

test.describe('Accessibility (axe)', () => {
  test('connect page: no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical).toEqual([]);
  });

  test('overview: no critical a11y violations after connecting', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[placeholder*="public key"]');
    await input.fill('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN');
    await page.locator('button', { hasText: 'CONNECT' }).click();
    // Wait for overview content to appear after successful connect
    await page.waitForSelector('[data-testid="overview-content"], text=Overview', {
      timeout: 30000,
    });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical).toEqual([]);
  });

  test('notifications bell has accessible label', async ({ page }) => {
    await page.goto('/');
    const bellButton = page.locator('button').filter({ has: page.locator('span[aria-hidden="true"]') }).last();
    await expect(bellButton).toHaveAttribute('aria-label');
  });
});
