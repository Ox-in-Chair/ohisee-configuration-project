import { test, expect } from '@playwright/test';

test.describe('Design System Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3008');
  });

  test('should load Poppins font for body text', async ({ page }) => {
    const bodyFontFamily = await page.evaluate(() =>
      window.getComputedStyle(document.body).fontFamily
    );
    // Font family should include Poppins (from --font-poppins variable)
    expect(bodyFontFamily.toLowerCase()).toContain('poppins');
  });

  test('should apply primary color (#1e40af) correctly', async ({ page }) => {
    const testElement = page.locator('[data-testid="primary-color-test"]');
    await expect(testElement).toBeVisible();

    const bgColor = await testElement.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Primary-600 = #1e40af = rgb(30, 64, 175)
    expect(bgColor).toBe('rgb(30, 64, 175)');
  });

  test('should have all design system colors defined', async ({ page }) => {
    // Check that CSS variables are defined
    const colors = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = window.getComputedStyle(root);

      return {
        primary: computedStyle.getPropertyValue('--color-primary-600').trim(),
        critical: computedStyle.getPropertyValue('--color-critical-600').trim(),
        warning: computedStyle.getPropertyValue('--color-warning-600').trim(),
        attention: computedStyle.getPropertyValue('--color-attention-500').trim(),
        success: computedStyle.getPropertyValue('--color-success-600').trim(),
        secondary: computedStyle.getPropertyValue('--color-secondary-600').trim(),
      };
    });

    expect(colors.primary).toBe('#1e40af');
    expect(colors.critical).toBe('#dc2626');
    expect(colors.warning).toBe('#ea580c');
    expect(colors.attention).toBe('#eab308');
    expect(colors.success).toBe('#16a34a');
    expect(colors.secondary).toBe('#475569');
  });

  test('should render shadcn/ui Button component', async ({ page }) => {
    const primaryButton = page.getByRole('button', { name: 'Primary Action' });
    await expect(primaryButton).toBeVisible();

    // Check that button has proper styling
    const buttonBg = await primaryButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Primary button should use primary color
    expect(buttonBg).toBe('rgb(30, 64, 175)');
  });

  test('should render shadcn/ui Card component', async ({ page }) => {
    const cardTitle = page.getByText('Design System Verification');
    await expect(cardTitle).toBeVisible();
  });

  test('should render shadcn/ui Badge components', async ({ page }) => {
    // Use more specific selectors to target badges specifically
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: 'Open' })).toBeVisible();
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: 'Draft' })).toBeVisible();
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: 'Critical' })).toBeVisible();
    await expect(page.locator('[data-slot="badge"]').filter({ hasText: 'Pending' })).toBeVisible();
  });

  test('should have correct font weights defined', async ({ page }) => {
    const fontWeights = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = window.getComputedStyle(root);

      return {
        normal: computedStyle.getPropertyValue('--font-weight-normal').trim(),
        medium: computedStyle.getPropertyValue('--font-weight-medium').trim(),
        semibold: computedStyle.getPropertyValue('--font-weight-semibold').trim(),
        bold: computedStyle.getPropertyValue('--font-weight-bold').trim(),
      };
    });

    expect(fontWeights.normal).toBe('400');
    expect(fontWeights.medium).toBe('500');
    expect(fontWeights.semibold).toBe('600');
    expect(fontWeights.bold).toBe('700');
  });

  test('should have correct opacity scale defined', async ({ page }) => {
    const opacities = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = window.getComputedStyle(root);

      return {
        opacity100: computedStyle.getPropertyValue('--opacity-100').trim(),
        opacity80: computedStyle.getPropertyValue('--opacity-80').trim(),
        opacity60: computedStyle.getPropertyValue('--opacity-60').trim(),
        opacity40: computedStyle.getPropertyValue('--opacity-40').trim(),
        opacity20: computedStyle.getPropertyValue('--opacity-20').trim(),
      };
    });

    expect(opacities.opacity100).toBe('1');
    expect(opacities.opacity80).toBe('.8'); // Tailwind 4 strips leading zero
    expect(opacities.opacity60).toBe('.6');
    expect(opacities.opacity40).toBe('.4');
    expect(opacities.opacity20).toBe('.2');
  });

  test('should load Inter font for data/numbers (font-alt)', async ({ page }) => {
    // Find element with font-alt class
    const dataElement = page.locator('.font-alt').first();
    await expect(dataElement).toBeVisible();

    const fontFamily = await dataElement.evaluate(el =>
      window.getComputedStyle(el).fontFamily
    );

    // Should include Inter font
    expect(fontFamily.toLowerCase()).toContain('inter');
  });

  test('should have background color set to #f9fafb', async ({ page }) => {
    const backgroundColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );

    // Background color should be #f9fafb = rgb(249, 250, 251)
    expect(backgroundColor).toBe('rgb(249, 250, 251)');
  });

  test('should render all color swatches', async ({ page }) => {
    // Verify all 6 color swatches are visible - use class selector to target only color boxes
    await expect(page.locator('.bg-primary-600 .text-white')).toContainText('Primary');
    await expect(page.locator('.bg-critical-600 .text-white')).toContainText('Critical');
    await expect(page.locator('.bg-warning-600 .text-white')).toContainText('Warning');
    await expect(page.locator('.bg-attention-500 .text-attention-900')).toContainText('Attention');
    await expect(page.locator('.bg-success-600 .text-white')).toContainText('Success');
    await expect(page.locator('.bg-secondary-600 .text-white')).toContainText('Secondary');
  });

  test('should have font smoothing applied', async ({ page }) => {
    const fontSmoothing = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return computedStyle.getPropertyValue('-webkit-font-smoothing');
    });

    expect(fontSmoothing).toBe('antialiased');
  });
});
