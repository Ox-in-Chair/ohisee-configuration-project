/**
 * E2E Test: NCA Detail Page - Complete View
 * Tests all 11 sections display correctly in read-only mode
 * Tests 404 handling for non-existent records
 * Simplified test (uses existing database records)
 */

import { test, expect } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';

const BASE_URL = 'http://localhost:3008';

test.describe('NCA Detail View - Complete Structure (Stagehand)', () => {
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

  test('should return 404 page when NCA record does not exist', async () => {
    const page = stagehand.page;

    // Navigate to non-existent NCA UUID
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await page.goto(`${BASE_URL}/nca/${nonExistentId}`);

    // Verify 404 response status
    expect(response?.status()).toBe(404);
  });

  test('should display all 11 sections in read-only mode for existing NCA', async () => {
    const page = stagehand.page;

    // Navigate to NCA register
    await page.goto(`${BASE_URL}/nca`);
    await page.waitForLoadState('networkidle');

    // Check if records exist
    const recordCount = await page.locator('table tbody tr').count();

    if (recordCount === 0) {
      console.log('No NCA records found - skipping test');
      test.skip();
      return;
    }

    // Click first record to view details
    await page.click('table tbody tr:first-child');

    // Wait for detail page URL pattern
    await page.waitForURL(/\/nca\/[a-f0-9-]+/);

    // Verify detail page container loaded
    await expect(page.locator('[data-testid="nca-detail-page"]')).toBeVisible({ timeout: 10000 });

    // Verify all 11 sections present
    const sections = [
      '[data-testid="nca-detail-section-1"]',
      '[data-testid="nca-detail-section-2"]',
      '[data-testid="nca-detail-section-3"]',
      '[data-testid="nca-detail-section-4"]',
      '[data-testid="nca-detail-section-5"]',
      '[data-testid="nca-detail-section-6"]',
      '[data-testid="nca-detail-section-7"]',
      '[data-testid="nca-detail-section-8"]',
      '[data-testid="nca-detail-section-9"]',
      '[data-testid="nca-detail-section-10"]',
      '[data-testid="nca-detail-section-11"]',
    ];

    for (const section of sections) {
      await expect(page.locator(section)).toBeVisible();
    }

    // Verify section headers
    await expect(page.locator('text=Section 1: NCA Identification')).toBeVisible();
    await expect(page.locator('text=Section 2: NC Classification')).toBeVisible();
    await expect(page.locator('text=Section 3: Supplier & Product Information')).toBeVisible();
    await expect(page.locator('text=Section 4: NC Description')).toBeVisible();
    await expect(page.locator('text=Section 5: Machine Status')).toBeVisible();
    await expect(page.locator('text=Section 6: Out of Spec Concession')).toBeVisible();
    await expect(page.locator('text=Section 7: Immediate Correction')).toBeVisible();
    await expect(page.locator('text=Section 8: Disposition')).toBeVisible();
    await expect(page.locator('text=Section 9: Root Cause Analysis')).toBeVisible();
    await expect(page.locator('text=Section 10: Corrective Action')).toBeVisible();
    await expect(page.locator('text=Section 11: Close Out')).toBeVisible();
  });

  test('should display NCA number in header and be read-only', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/nca`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/nca\/[a-f0-9-]+/);

    // Verify NCA number in header
    const headerText = await page.locator('[data-testid="nca-detail-header"]').textContent();
    expect(headerText).toContain('NCA-');

    // Verify h1 contains NCA number
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toMatch(/NCA-\d{4}-\d+/);

    // Verify read-only message
    await expect(page.locator('text=Read Only')).toBeVisible();

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

  test('should display status badge and work order section', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/nca`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/nca\/[a-f0-9-]+/);

    // Verify status badge
    await expect(page.locator('[data-testid="nca-status-badge"]')).toBeVisible();

    // Verify work order section
    await expect(page.locator('[data-testid="nca-detail-work-order"]')).toBeVisible();

    // Verify attachments section
    await expect(page.locator('[data-testid="nca-detail-attachments"]')).toBeVisible();
  });

  test('should display formatted dates (not raw ISO strings)', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/nca`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/nca\/[a-f0-9-]+/);

    // Verify date is formatted (not containing ISO markers)
    const dateElement = page.locator('[data-testid="nca-detail-date"]');
    await expect(dateElement).toBeVisible();

    const dateText = await dateElement.textContent();
    expect(dateText).not.toContain('T');
    expect(dateText).not.toContain('Z');
  });

  test('should have working back button to return to register', async () => {
    const page = stagehand.page;

    await page.goto(`${BASE_URL}/nca`);
    await page.waitForLoadState('networkidle');

    const recordCount = await page.locator('table tbody tr').count();
    if (recordCount === 0) {
      test.skip();
      return;
    }

    await page.click('table tbody tr:first-child');
    await page.waitForURL(/\/nca\/[a-f0-9-]+/);

    // Verify back button exists
    await expect(page.locator('[data-testid="btn-back-to-register"]')).toBeVisible();

    // Click back button
    await page.click('[data-testid="btn-back-to-register"]');

    // Verify navigation back to register
    await page.waitForURL(`${BASE_URL}/nca`, { timeout: 5000 });
    await expect(page).toHaveURL(`${BASE_URL}/nca`);
  });
});
