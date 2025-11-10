/**
 * E2E Test: MJC Detail Page - Complete View
 * Tests all 11 sections display correctly in read-only mode
 * Tests hygiene checklist (10 items) display
 * Tests temporary repair countdown display
 * Tests 404 handling for non-existent records
 */

import { test, expect } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';

const BASE_URL = 'http://localhost:3008';

test.describe('MJC Detail View - Complete Structure (Stagehand)', () => {
  let stagehand: Stagehand;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      enableCaching: false,
    });
    await stagehand.init();
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should return 404 page when MJC record does not exist', async () => {
    const page = stagehand.page;

    // Navigate to non-existent MJC UUID
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await page.goto(`${BASE_URL}/mjc/${nonExistentId}`);

    // Verify 404 response status
    expect(response?.status()).toBe(404);
  });

  test('should display all 11 sections in read-only mode for existing MJC', async () => {
    const page = stagehand.page;

    // Navigate to MJC register
    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    // Check if records exist
    const recordCount = await page.locator('table tbody tr').count();

    if (recordCount === 0) {
      console.log('No MJC records found - skipping test');
      test.skip();
      return;
    }

    // Click first record to view details
    await page.click('table tbody tr:first-child');

    // Wait for detail page URL pattern
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Verify detail page container loaded
    await expect(page.locator('[data-testid="mjc-detail-page"]')).toBeVisible({ timeout: 10000 });

    // Verify all 11 sections present
    const sections = [
      '[data-testid="mjc-detail-section-1"]',
      '[data-testid="mjc-detail-section-2"]',
      '[data-testid="mjc-detail-section-3"]',
      '[data-testid="mjc-detail-section-4"]',
      '[data-testid="mjc-detail-section-5"]',
      '[data-testid="mjc-detail-section-6"]',
      '[data-testid="mjc-detail-section-7"]',
      '[data-testid="mjc-detail-section-8"]',
      '[data-testid="mjc-detail-section-9"]',
      '[data-testid="mjc-detail-section-10"]',
      '[data-testid="mjc-detail-section-11"]',
    ];

    for (const section of sections) {
      await expect(page.locator(section)).toBeVisible();
    }

    // Verify section headers
    await expect(page.locator('text=Section 1: Job Card Identification')).toBeVisible();
    await expect(page.locator('text=Section 2: Machine/Equipment Identification')).toBeVisible();
    await expect(page.locator('text=Section 3: Maintenance Type & Classification')).toBeVisible();
    await expect(page.locator('text=Section 4: Machine Status & Urgency')).toBeVisible();
    await expect(page.locator('text=Section 5: Temporary Repair Status')).toBeVisible();
    await expect(page.locator('text=Section 6: Description of Maintenance Required')).toBeVisible();
    await expect(page.locator('text=Section 7: Maintenance Performed')).toBeVisible();
    await expect(page.locator('text=Section 8: Additional Comments')).toBeVisible();
    await expect(page.locator('text=Section 9: Post Hygiene Clearance Record')).toBeVisible();
    await expect(page.locator('text=Section 10: Post Hygiene Clearance Signature')).toBeVisible();
    await expect(page.locator('text=Section 11: Job Card Status & Closure')).toBeVisible();
  });

  test('should display MJC number in header and show urgency badge', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Verify MJC number in header
    const headerText = await page.locator('[data-testid="mjc-detail-header"]').textContent();
    expect(headerText).toContain('MJC-');

    // Verify h1 contains MJC number
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toMatch(/MJC-\d{4}-\d+/);

    // Verify urgency badge
    await expect(page.locator('[data-testid="mjc-urgency-badge"]')).toBeVisible();

    // Verify status badge
    await expect(page.locator('[data-testid="mjc-status-badge"]')).toBeVisible();

    // Verify read-only message
    await expect(page.locator('text=Read Only')).toBeVisible();
  });

  test('should display hygiene checklist with 10 items', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Verify hygiene checklist section
    await expect(page.locator('[data-testid="mjc-hygiene-checklist"]')).toBeVisible();

    // Count hygiene checklist items (should be exactly 10)
    const checklistItems = await page.locator('[data-testid^="hygiene-item-"]').count();
    expect(checklistItems).toBe(10);

    // Verify specific checklist items exist
    await expect(page.locator('text=All tools removed from work area')).toBeVisible();
    await expect(page.locator('text=Work area cleaned and sanitized')).toBeVisible();
    await expect(page.locator('text=No foreign objects left behind')).toBeVisible();
    await expect(page.locator('text=Machine guards replaced')).toBeVisible();
    await expect(page.locator('text=Safety interlocks functional')).toBeVisible();
    await expect(page.locator('text=All panels secured')).toBeVisible();
    await expect(page.locator('text=No oil or grease contamination')).toBeVisible();
    await expect(page.locator('text=Floor area clean')).toBeVisible();
    await expect(page.locator('text=Waste properly disposed')).toBeVisible();
    await expect(page.locator('text=Documentation complete')).toBeVisible();
  });

  test('should display temporary repair countdown if applicable', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Check if temporary repair section exists
    const tempRepairCountdownExists = await page
      .locator('[data-testid="mjc-temp-repair-countdown"]')
      .count();

    const noTempRepairExists = await page.locator('[data-testid="mjc-no-temp-repair"]').count();

    // One of these should be visible
    expect(tempRepairCountdownExists + noTempRepairExists).toBeGreaterThan(0);

    if (tempRepairCountdownExists > 0) {
      // If temporary repair, verify countdown elements
      await expect(page.locator('[data-testid="mjc-temp-repair-due-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="mjc-days-remaining"]')).toBeVisible();

      // Verify days remaining text format
      const daysText = await page.locator('[data-testid="mjc-days-remaining"]').textContent();
      expect(daysText).toMatch(/\d+\s*(day|days)/i);
    }

    if (noTempRepairExists > 0) {
      // If no temporary repair, verify message
      await expect(page.locator('[data-testid="mjc-no-temp-repair"]')).toBeVisible();
    }
  });

  test('should display work order section and be read-only', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Verify work order section
    await expect(page.locator('[data-testid="mjc-detail-work-order"]')).toBeVisible();

    // Verify no editable fields
    const editableInputs = await page.locator('input[type="text"]:not([readonly])').count();
    expect(editableInputs).toBe(0);

    const editableTextareas = await page.locator('textarea:not([readonly])').count();
    expect(editableTextareas).toBe(0);

    // Verify no submit/save buttons
    const submitButtons = await page
      .locator('button:has-text("Submit"), button:has-text("Save")')
      .count();
    expect(submitButtons).toBe(0);
  });

  test('should have working back button to return to register', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Verify back button exists
    await expect(page.locator('[data-testid="btn-back-to-register"]')).toBeVisible();

    // Click back button
    await page.click('[data-testid="btn-back-to-register"]');

    // Verify navigation back to register
    await page.waitForURL(`${BASE_URL}/mjc`, { timeout: 5000 });
    await expect(page).toHaveURL(`${BASE_URL}/mjc`);
  });

  test('should display BRCGS critical hygiene section with proper labeling', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/mjc`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/mjc\/[a-f0-9-]+/);

    // Verify BRCGS CRITICAL labeling in Section 9
    await expect(
      page.locator('text=Section 9: Post Hygiene Clearance Record (BRCGS CRITICAL)')
    ).toBeVisible();

    // Verify description mentions verification requirement
    await expect(
      page.locator('text=All 10 items must be verified before production clearance')
    ).toBeVisible();
  });
});
