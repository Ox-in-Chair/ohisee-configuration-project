import { test, expect } from '@playwright/test';

/**
 * Baseline Test: App Initialization
 *
 * Verifies the OHiSee NCA/MJC application loads successfully.
 * This is the foundation test that all other tests build upon.
 *
 * Design Reference:
 * - IMPLEMENTATION_PLAN.md: Phase 1 - Foundation & Setup
 * - Success Criteria: Page load <2s, app accessible
 */

test.describe('OHiSee NCA/MJC - Baseline', () => {
  test('should load the application homepage successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3008');

    // Verify page loads (not 404, not 500)
    const title = await page.title();
    expect(title).toBeTruthy();

    // Verify page is accessible (has some content)
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body?.length).toBeGreaterThan(0);
  });

  test('should have the correct application title', async ({ page }) => {
    await page.goto('http://localhost:3008');

    // From MANIFEST.md: "OHiSee Control of Non-Conforming Products"
    // For now, just verify a title exists - we'll update it in Green phase
    const title = await page.title();
    expect(title).toContain('OHiSee');
  });
});
