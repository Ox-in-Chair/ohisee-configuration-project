/**
 * E2E Test: MJC Complete Workflow using Stagehand
 * Tests full user journey for Maintenance Job Card form
 * Validates hygiene checklist, temporary repair logic, and production clearance
 */

import { test, expect } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';

const BASE_URL = 'http://localhost:3008';

test.describe('MJC Form - Complete Workflow (Stagehand)', () => {
  let stagehand: Stagehand;

  test.beforeEach(async () => {
    // Initialize Stagehand in LOCAL mode
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

  test('should complete full MJC form submission with all valid data', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Verify page loaded
    await expect(page.locator('[data-testid="mjc-form-title"]')).toBeVisible();

    // Section 2: Machine/Equipment Identification (REQUIRED)
    await page.fill('[data-testid="machine-equipment-id"]', 'PKG-LINE-001');

    // Section 3: Maintenance Type & Classification (REQUIRED)
    await page.click('[data-testid="maintenance-category-reactive"]');
    await page.click('[data-testid="maintenance-type-mechanical"]');

    // Section 4: Machine Status & Urgency (REQUIRED)
    await page.click('[data-testid="machine-status-operational"]');
    await page.click('[data-testid="urgency-medium"]');

    // Section 5: Temporary Repair Status (REQUIRED)
    await page.click('[data-testid="temporary-repair-no"]');

    // Verify due date field shows N/A for non-temporary repair
    const dueDate = page.locator('[data-testid="temporary-repair-due-date"]');
    await expect(dueDate).toHaveValue('');

    // Section 6: Maintenance Description (minimum 100 characters REQUIRED)
    const maintenanceDescription =
      'Mechanical conveyor belt adjustment required due to misalignment detected during routine inspection. The belt tracking was off center by approximately 2cm causing potential product damage. Adjustment performed using standard tensioning procedure and verified for proper alignment.';
    await page.fill('[data-testid="maintenance-description"]', maintenanceDescription);

    // Verify character counter shows success
    const charCounter = page.locator('[data-testid="maintenance-description-char-count"]');
    await expect(charCounter).toContainText(`${maintenanceDescription.length}`);

    // Section 9: Complete all 10 hygiene checklist items
    await page.check('[data-testid="hygiene-check-1"]');
    await page.check('[data-testid="hygiene-check-2"]');
    await page.check('[data-testid="hygiene-check-3"]');
    await page.check('[data-testid="hygiene-check-4"]');
    await page.check('[data-testid="hygiene-check-5"]');
    await page.check('[data-testid="hygiene-check-6"]');
    await page.check('[data-testid="hygiene-check-7"]');
    await page.check('[data-testid="hygiene-check-8"]');
    await page.check('[data-testid="hygiene-check-9"]');
    await page.check('[data-testid="hygiene-check-10"]');

    // Verify progress indicator shows 10/10
    await expect(page.locator('text=10/10 items verified')).toBeVisible();
    await expect(page.locator('text=All items verified!')).toBeVisible();

    // Section 10: Production clearance should now be enabled
    const clearanceCheckbox = page.locator('[data-testid="production-cleared"]');
    await expect(clearanceCheckbox).toBeEnabled();

    // Grant production clearance
    await page.fill('[data-testid="clearance-qa-supervisor"]', 'Mike Johnson - QA Supervisor');
    await page.fill('[data-testid="clearance-signature"]', 'MikeJ');
    await clearanceCheckbox.check();

    // Submit form
    await page.click('[data-testid="btn-submit"]');

    // Verify success message
    await expect(page.locator('text=MJC submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should auto-calculate due date when temporary repair is YES', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Fill minimum required fields
    await page.fill('[data-testid="machine-equipment-id"]', 'TEMP-REPAIR-TEST-001');
    await page.click('[data-testid="maintenance-category-planned"]');
    await page.click('[data-testid="maintenance-type-electrical"]');
    await page.click('[data-testid="machine-status-operational"]');
    await page.click('[data-testid="urgency-low"]');

    // Select Temporary Repair YES
    await page.click('[data-testid="temporary-repair-yes"]');

    // Verify due date auto-calculated (+14 days)
    const dueDate = page.locator('[data-testid="temporary-repair-due-date"]');
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 14);
    const expectedDateStr = expectedDate.toLocaleDateString();

    await expect(dueDate).toHaveValue(expectedDateStr);

    // Complete form
    await page.fill(
      '[data-testid="maintenance-description"]',
      'Temporary electrical repair applied to maintain operations until permanent parts arrive. Follow-up scheduled in 14 days for complete replacement of electrical components and final testing verification.'
    );

    // Submit without hygiene checklist (should fail)
    await page.click('[data-testid="btn-submit"]');

    // Form should show validation - need to complete hygiene checklist
    // (Form will be invalid until all required fields including hygiene are done)
  });

  test('should show urgency field when machine status is DOWN', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Fill minimum required fields
    await page.fill('[data-testid="machine-equipment-id"]', 'CRITICAL-MACHINE-001');
    await page.click('[data-testid="maintenance-category-reactive"]');
    await page.click('[data-testid="maintenance-type-pneumatical"]');

    // Select Machine Status DOWN
    await page.click('[data-testid="machine-status-down"]');

    // Urgency field should be visible (always visible, but more critical when down)
    await expect(page.locator('[data-testid="urgency-critical"]')).toBeVisible();
    await expect(page.locator('[data-testid="urgency-high"]')).toBeVisible();

    // Select critical urgency for machine down
    await page.click('[data-testid="urgency-critical"]');

    // Complete other required fields
    await page.click('[data-testid="temporary-repair-no"]');
    await page.fill(
      '[data-testid="maintenance-description"]',
      'Critical pneumatic system failure causing complete machine shutdown. Air pressure loss detected in main supply line requiring immediate repair to restore production capability and prevent further downtime.'
    );

    // Note: machine_down_time should auto-calculate
    const machineDownTime = page.locator('[data-testid="machine-down-time"]');
    await expect(machineDownTime).toHaveAttribute('readonly', '');
  });

  test('should validate character counter for maintenance description (minimum 100 chars)', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Fill required fields
    await page.fill('[data-testid="machine-equipment-id"]', 'CHAR-COUNT-TEST');
    await page.click('[data-testid="maintenance-category-planned"]');
    await page.click('[data-testid="maintenance-type-mechanical"]');
    await page.click('[data-testid="machine-status-operational"]');
    await page.click('[data-testid="urgency-low"]');
    await page.click('[data-testid="temporary-repair-no"]');

    // Fill description with less than 100 characters
    const shortDescription = 'Short maintenance description.'; // ~30 chars
    await page.fill('[data-testid="maintenance-description"]', shortDescription);

    // Verify character counter shows count
    const charCounter = page.locator('[data-testid="maintenance-description-char-count"]');
    await expect(charCounter).toContainText(`${shortDescription.length}`);
    await expect(charCounter).toContainText('100'); // Shows minimum

    // Try to submit
    await page.click('[data-testid="btn-submit"]');

    // Verify validation error
    await expect(
      page.locator('text=Description must be at least 100 characters for BRCGS compliance')
    ).toBeVisible();

    // Fill with valid description (100+ characters)
    const validDescription =
      'Comprehensive maintenance description that meets the one hundred character minimum requirement for BRCGS compliance. This provides adequate detail about the maintenance work performed including scope and outcome.';
    await page.fill('[data-testid="maintenance-description"]', validDescription);

    // Verify counter updates
    await expect(charCounter).toContainText(`${validDescription.length}`);
  });

  test('should require all 10 hygiene items before enabling production clearance', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Fill minimum required fields
    await page.fill('[data-testid="machine-equipment-id"]', 'HYGIENE-TEST-001');
    await page.click('[data-testid="maintenance-category-reactive"]');
    await page.click('[data-testid="maintenance-type-mechanical"]');
    await page.click('[data-testid="machine-status-operational"]');
    await page.click('[data-testid="urgency-medium"]');
    await page.click('[data-testid="temporary-repair-no"]');
    await page.fill(
      '[data-testid="maintenance-description"]',
      'Hygiene checklist validation test. This maintenance requires post-hygiene clearance verification before production can resume. All ten checklist items must be verified and documented per BRCGS requirements.'
    );

    // Verify production cleared checkbox is disabled initially
    const clearanceCheckbox = page.locator('[data-testid="production-cleared"]');
    await expect(clearanceCheckbox).toBeDisabled();

    // Check only 9 out of 10 hygiene items
    await page.check('[data-testid="hygiene-check-1"]');
    await page.check('[data-testid="hygiene-check-2"]');
    await page.check('[data-testid="hygiene-check-3"]');
    await page.check('[data-testid="hygiene-check-4"]');
    await page.check('[data-testid="hygiene-check-5"]');
    await page.check('[data-testid="hygiene-check-6"]');
    await page.check('[data-testid="hygiene-check-7"]');
    await page.check('[data-testid="hygiene-check-8"]');
    await page.check('[data-testid="hygiene-check-9"]');
    // Intentionally skip hygiene-check-10

    // Verify progress indicator shows 9/10
    await expect(page.locator('text=9/10 items verified')).toBeVisible();

    // Production cleared checkbox should still be disabled
    await expect(clearanceCheckbox).toBeDisabled();

    // Warning message should be visible
    await expect(page.locator('text=All 10 hygiene items must be verified')).toBeVisible();

    // Check the 10th item
    await page.check('[data-testid="hygiene-check-10"]');

    // Verify progress indicator updates to 10/10
    await expect(page.locator('text=10/10 items verified')).toBeVisible();
    await expect(page.locator('text=All items verified!')).toBeVisible();

    // Production cleared checkbox should now be enabled
    await expect(clearanceCheckbox).toBeEnabled();

    // Try to check clearance without signature
    await clearanceCheckbox.check();

    // Submit form
    await page.click('[data-testid="btn-submit"]');

    // Should show validation error for missing signature
    await expect(
      page.locator('text=Digital signature is required when granting production clearance')
    ).toBeVisible();

    // Fill signature fields
    await page.fill('[data-testid="clearance-qa-supervisor"]', 'Vernon Smith - QA Lead');
    await page.fill('[data-testid="clearance-signature"]', 'VernonS');

    // Submit again
    await page.click('[data-testid="btn-submit"]');

    // Should succeed now
    await expect(page.locator('text=MJC submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should track hygiene checklist progress indicator', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Initially should show 0/10
    await expect(page.locator('text=0/10 items verified')).toBeVisible();

    // Check items one by one and verify progress updates
    await page.check('[data-testid="hygiene-check-1"]');
    await expect(page.locator('text=1/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-2"]');
    await expect(page.locator('text=2/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-3"]');
    await expect(page.locator('text=3/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-4"]');
    await expect(page.locator('text=4/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-5"]');
    await expect(page.locator('text=5/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-6"]');
    await expect(page.locator('text=6/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-7"]');
    await expect(page.locator('text=7/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-8"]');
    await expect(page.locator('text=8/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-9"]');
    await expect(page.locator('text=9/10 items verified')).toBeVisible();

    await page.check('[data-testid="hygiene-check-10"]');
    await expect(page.locator('text=10/10 items verified')).toBeVisible();
    await expect(page.locator('text=All items verified!')).toBeVisible();
  });

  test('should require maintenance type "other" specification', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Fill required fields
    await page.fill('[data-testid="machine-equipment-id"]', 'OTHER-TYPE-TEST');
    await page.click('[data-testid="maintenance-category-planned"]');

    // Select maintenance type "other"
    await page.click('[data-testid="maintenance-type-other"]');

    // Verify conditional field appears
    const otherTypeField = page.locator('input[name="maintenance_type_other"]');
    await expect(otherTypeField).toBeVisible();

    // Complete other required fields
    await page.click('[data-testid="machine-status-operational"]');
    await page.click('[data-testid="urgency-low"]');
    await page.click('[data-testid="temporary-repair-no"]');
    await page.fill(
      '[data-testid="maintenance-description"]',
      'Specialized maintenance type other than electrical, mechanical, or pneumatical. This requires custom specification of the maintenance category to properly document the work performed for compliance records.'
    );

    // Try to submit without specifying maintenance type
    await page.click('[data-testid="btn-submit"]');

    // Verify validation error
    await expect(
      page.locator('text=Please specify the maintenance type (minimum 10 characters)')
    ).toBeVisible();

    // Fill with valid specification
    await otherTypeField.fill('Hydraulic system maintenance');

    // Complete hygiene checklist
    for (let i = 1; i <= 10; i++) {
      await page.check(`[data-testid="hygiene-check-${i}"]`);
    }

    // Grant clearance
    await page.fill('[data-testid="clearance-qa-supervisor"]', 'Test Supervisor');
    await page.fill('[data-testid="clearance-signature"]', 'TestSig');
    await page.check('[data-testid="production-cleared"]');

    // Submit again
    await page.click('[data-testid="btn-submit"]');

    // Should succeed now
    await expect(page.locator('text=MJC submitted successfully!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should display all 11 sections of MJC form', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Verify all sections are present
    await expect(page.locator('[data-testid="mjc-section-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-6"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-7"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-8"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-9"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-10"]')).toBeVisible();
    await expect(page.locator('[data-testid="mjc-section-11"]')).toBeVisible();

    // Verify auto-generated fields are read-only
    await expect(page.locator('[data-testid="mjc-date"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-testid="mjc-time"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-testid="mjc-number"]')).toHaveAttribute('readonly', '');
    await expect(page.locator('[data-testid="mjc-raised-by"]')).toHaveAttribute('readonly', '');
  });

  test('should handle form cancellation and reset', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Fill some fields
    await page.fill('[data-testid="machine-equipment-id"]', 'CANCEL-TEST-001');
    await page.click('[data-testid="maintenance-category-reactive"]');
    await page.fill('[data-testid="maintenance-description"]', 'Test description to be cancelled');

    // Click cancel button
    await page.click('[data-testid="btn-cancel"]');

    // Verify fields are cleared
    await expect(page.locator('[data-testid="machine-equipment-id"]')).toHaveValue('');
    await expect(page.locator('[data-testid="maintenance-description"]')).toHaveValue('');
  });

  test('should disable submit button when form is invalid', async () => {
    const page = stagehand.page;
    await page.goto(`${BASE_URL}/mjc/new`);

    // Submit button should be disabled initially
    const submitBtn = page.locator('[data-testid="btn-submit"]');
    await expect(submitBtn).toBeDisabled();

    // Fill required fields incrementally
    await page.fill('[data-testid="machine-equipment-id"]', 'VALIDATION-TEST');
    // Still disabled - more required

    await page.click('[data-testid="maintenance-category-reactive"]');
    // Still disabled

    await page.click('[data-testid="maintenance-type-mechanical"]');
    // Still disabled

    await page.click('[data-testid="machine-status-operational"]');
    // Still disabled

    await page.click('[data-testid="urgency-medium"]');
    // Still disabled

    await page.click('[data-testid="temporary-repair-no"]');
    // Still disabled - description required

    await page.fill(
      '[data-testid="maintenance-description"]',
      'Complete maintenance description exceeding one hundred characters minimum requirement for BRCGS compliance validation. This enables the submit button when all required fields are properly filled.'
    );

    // Submit should now be enabled (all minimum required fields filled)
    await expect(submitBtn).toBeEnabled();
  });
});
