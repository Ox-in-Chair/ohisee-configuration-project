/**
 * E2E Test: NCA Complete Workflow using Stagehand
 * Tests full user journey from form navigation to submission
 * Uses hybrid AI + data-testid approach for robust testing
 */

import { test, expect } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';

const BASE_URL = 'http://localhost:3008';

test.describe('NCA Form - Complete Workflow (Stagehand)', () => {
  let stagehand: Stagehand;

  test.beforeEach(async () => {
    // Initialize Stagehand in LOCAL mode for development
    stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      debugDom: true,
      enableCaching: false,
    });
    await stagehand.init();
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should complete full NCA form submission with valid data', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Verify page loaded
    await expect(page.locator('[data-testid="nca-form-title"]')).toBeVisible();

    // Section 2: NC Classification - Select NC Type (REQUIRED)
    await page.click('[data-testid="nc-type-raw-material"]');

    // Section 3: Supplier & Product Information
    await page.fill('[data-testid="supplier-name"]', 'Test Supplier Ltd');
    await page.fill(
      '[data-testid="nc-product-description"]',
      'Premium corrugated cardboard packaging material with custom printing'
    );

    // Section 4: NC Description (minimum 100 characters REQUIRED)
    const ncDescription =
      'Defective packaging seal detected on finished goods during quality inspection. The seal integrity is compromised on approximately 50 units causing potential contamination risk. Immediate action required to prevent product release to customer. Root cause appears to be heat sealing equipment malfunction.';
    await page.fill('[data-testid="nc-description"]', ncDescription);

    // Verify character counter shows success (>= 100 chars)
    const charCounter = page.locator('[data-testid="nc-description-char-count"]');
    await expect(charCounter).toContainText(`${ncDescription.length}`);

    // Section 5: Machine Status - Select OPERATIONAL (no conditional fields)
    await page.click('[data-testid="machine-status-operational"]');

    // Section 7: Cross Contamination - Select NO (no conditional fields)
    await page.click('[data-testid="cross-contamination-no"]');

    // Section 7: Check immediate correction items
    await page.check('[data-testid="hold-label-completed"]');
    await page.check('[data-testid="nca-logged"]');

    // Section 8: Disposition - Select REJECT (no rework instruction needed)
    await page.click('[data-testid="disposition-reject"]');

    // Submit form
    await page.click('[data-testid="btn-submit"]');

    // Verify success message appears
    await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show alert when machine status is DOWN and require additional fields', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Fill minimum required fields first
    await page.click('[data-testid="nc-type-finished-goods"]');
    await page.fill(
      '[data-testid="nc-product-description"]',
      'Test product description minimum 10 chars'
    );
    await page.fill(
      '[data-testid="nc-description"]',
      'This is a comprehensive test description that exceeds the minimum 100 character requirement for BRCGS compliance and provides detailed information about the non-conformance discovered during inspection.'
    );

    // Select Machine Status DOWN
    await page.click('[data-testid="machine-status-down"]');

    // Verify conditional fields appear
    const machineDownSince = page.locator('input[name="machine_down_since"]');
    await expect(machineDownSince).toBeVisible();

    const estimatedDowntime = page.locator('input[name="estimated_downtime"]');
    await expect(estimatedDowntime).toBeVisible();

    // Try to submit without filling machine down fields
    await page.click('[data-testid="btn-submit"]');

    // Verify validation error appears
    await expect(
      page.locator('text=Machine down since timestamp is required when machine is down')
    ).toBeVisible();

    // Fill the required conditional fields
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    await machineDownSince.fill(timestamp);
    await estimatedDowntime.fill('120'); // 120 minutes

    // Complete other required fields
    await page.click('[data-testid="cross-contamination-no"]');

    // Now submit should work (but form will still need disposition)
    await page.click('[data-testid="btn-submit"]');

    // Form should submit successfully now
    await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should require back tracking person when cross-contamination is YES', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Fill minimum required fields
    await page.click('[data-testid="nc-type-wip"]');
    await page.fill(
      '[data-testid="nc-product-description"]',
      'Work in progress contaminated material'
    );
    await page.fill(
      '[data-testid="nc-description"]',
      'Cross-contamination detected in work in progress area. Foreign material found in production line requiring immediate investigation and back tracking to identify source and scope of contamination event.'
    );
    await page.click('[data-testid="machine-status-operational"]');

    // Select Cross Contamination YES
    await page.click('[data-testid="cross-contamination-yes"]');

    // Verify back tracking person field appears
    const backTrackingPerson = page.locator('input[name="back_tracking_person"]');
    await expect(backTrackingPerson).toBeVisible();

    // Try to submit without back tracking person
    await page.click('[data-testid="btn-submit"]');

    // Verify validation error
    await expect(
      page.locator('text=Back tracking person is required when cross-contamination is detected')
    ).toBeVisible();

    // Fill back tracking person
    await backTrackingPerson.fill('John Smith - QA Manager');

    // Submit again
    await page.click('[data-testid="btn-submit"]');

    // Should succeed now
    await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should require rework instruction when disposition is REWORK', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Fill minimum required fields
    await page.click('[data-testid="nc-type-finished-goods"]');
    await page.fill(
      '[data-testid="nc-product-description"]',
      'Finished goods requiring rework procedure'
    );
    await page.fill(
      '[data-testid="nc-description"]',
      'Finished goods packaging has minor defects that can be corrected through rework procedures. Quality inspection identified cosmetic issues that do not affect product integrity but require correction before customer delivery.'
    );
    await page.click('[data-testid="machine-status-operational"]');
    await page.click('[data-testid="cross-contamination-no"]');

    // Select Disposition REWORK
    await page.click('[data-testid="disposition-rework"]');

    // Verify rework instruction field appears
    const reworkInstruction = page.locator('[data-testid="rework-instruction"]');
    await expect(reworkInstruction).toBeVisible();

    // Try to submit without rework instruction
    await page.click('[data-testid="btn-submit"]');

    // Verify validation error (minimum 20 characters)
    await expect(
      page.locator('text=Rework instruction must be at least 20 characters when rework is selected')
    ).toBeVisible();

    // Fill rework instruction (minimum 20 characters)
    await reworkInstruction.fill(
      'Remove defective labels and reapply using approved label stock. Verify seal integrity post-rework.'
    );

    // Submit again
    await page.click('[data-testid="btn-submit"]');

    // Should succeed now
    await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should validate character counter for NC Description (minimum 100 chars)', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Fill minimum required fields except NC description
    await page.click('[data-testid="nc-type-incident"]');
    await page.fill('[data-testid="nc-product-description"]', 'Test product incident');
    await page.click('[data-testid="machine-status-operational"]');

    // Fill NC description with less than 100 characters
    const shortDescription = 'Short description that is less than minimum required.'; // ~54 chars
    await page.fill('[data-testid="nc-description"]', shortDescription);

    // Verify character counter shows warning/error state
    const charCounter = page.locator('[data-testid="nc-description-char-count"]');
    await expect(charCounter).toContainText(`${shortDescription.length}`);
    await expect(charCounter).toContainText('100'); // Should show minimum requirement

    // Try to submit
    await page.click('[data-testid="btn-submit"]');

    // Verify validation error
    await expect(
      page.locator('text=Description must be at least 100 characters for compliance')
    ).toBeVisible();

    // Fill with exactly 100 characters
    const validDescription =
      'This is a properly detailed description of the non-conformance that meets the minimum one hundred character requirement for BRCGS compliance and quality documentation standards.';
    await page.fill('[data-testid="nc-description"]', validDescription);

    // Verify counter updates and shows success
    await expect(charCounter).toContainText(`${validDescription.length}`);

    // Complete other required fields
    await page.click('[data-testid="cross-contamination-no"]');

    // Submit should work now
    await page.click('[data-testid="btn-submit"]');
    await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should handle form cancellation and reset', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Fill some fields
    await page.click('[data-testid="nc-type-raw-material"]');
    await page.fill('[data-testid="supplier-name"]', 'Test Supplier');
    await page.fill('[data-testid="nc-product-description"]', 'Test product to be cancelled');

    // Click cancel button
    await page.click('[data-testid="btn-cancel"]');

    // Verify fields are cleared (form reset)
    // Note: Radio buttons and some fields may not clear depending on form implementation
    await expect(page.locator('[data-testid="supplier-name"]')).toHaveValue('');
    await expect(page.locator('[data-testid="nc-product-description"]')).toHaveValue('');
  });

  test('should display all 11 sections of NCA form', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Verify all sections are present
    await expect(page.locator('[data-testid="nca-section-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-6"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-7"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-8"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-9"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-10"]')).toBeVisible();
    await expect(page.locator('[data-testid="nca-section-11"]')).toBeVisible();

    // Verify auto-generated fields are read-only
    await expect(page.locator('[data-testid="nca-date"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-testid="nca-number"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-testid="nca-raised-by"]')).toHaveAttribute('readonly', '');
  });

  test('should disable submit button when form is invalid', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/nca/new`);

    // Submit button should be disabled initially (no required fields filled)
    const submitBtn = page.locator('[data-testid="btn-submit"]');
    await expect(submitBtn).toBeDisabled();

    // Fill required fields one by one
    await page.click('[data-testid="nc-type-raw-material"]');
    // Still disabled - more required fields needed

    await page.fill(
      '[data-testid="nc-product-description"]',
      'Product description for validation test'
    );
    // Still disabled - NC description required

    await page.fill(
      '[data-testid="nc-description"]',
      'Comprehensive NC description that exceeds the minimum one hundred character requirement for BRCGS compliance and regulatory documentation standards. This provides sufficient detail for investigation.'
    );
    // Still disabled - machine status required

    await page.click('[data-testid="machine-status-operational"]');
    // Submit should now be enabled (all required fields filled)
    await expect(submitBtn).toBeEnabled();
  });
});
