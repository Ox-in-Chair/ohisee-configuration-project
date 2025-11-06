/**
 * E2E Test: Validation Scenarios using Stagehand
 * Tests comprehensive validation rules across NCA and MJC forms
 * Focuses on edge cases, error handling, and form validation behavior
 */

import { test, expect } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';

const BASE_URL = 'http://localhost:3008';

test.describe('Form Validation Scenarios (Stagehand)', () => {
  let stagehand: Stagehand;

  test.beforeEach(async () => {
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

  test.describe('NCA Form Validation', () => {
    test('should show validation errors when submitting empty NCA form', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Try to submit completely empty form
      const submitBtn = page.locator('[data-testid="btn-submit"]');

      // Submit button should be disabled when form is invalid
      await expect(submitBtn).toBeDisabled();

      // Even if we could click it, validation would prevent submission
      // This verifies real-time validation is working
    });

    test('should validate NC product description minimum length (10 chars)', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill NC type
      await page.click('[data-testid="nc-type-raw-material"]');

      // Try very short product description (less than 10 chars)
      await page.fill('[data-testid="nc-product-description"]', 'short');

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Product description must be at least 10 characters')
      ).toBeVisible();

      // Fix with valid length
      await page.fill('[data-testid="nc-product-description"]', 'Valid product description');

      // Error should clear
      await expect(
        page.locator('text=Product description must be at least 10 characters')
      ).not.toBeVisible();
    });

    test('should validate NC product description maximum length (500 chars)', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      await page.click('[data-testid="nc-type-finished-goods"]');

      // Create string longer than 500 characters
      const longDescription = 'A'.repeat(501);
      await page.fill('[data-testid="nc-product-description"]', longDescription);

      // Character counter should show 501/500
      await expect(page.locator('text=500')).toBeVisible();

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Product description cannot exceed 500 characters')
      ).toBeVisible();
    });

    test('should validate NC description minimum 100 characters', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      await page.click('[data-testid="nc-type-wip"]');
      await page.fill('[data-testid="nc-product-description"]', 'Valid product');

      // Fill with 99 characters (just under minimum)
      const desc99 = 'A'.repeat(99);
      await page.fill('[data-testid="nc-description"]', desc99);

      // Character counter should show 99/100
      const charCounter = page.locator('[data-testid="nc-description-char-count"]');
      await expect(charCounter).toContainText('99');

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Description must be at least 100 characters for compliance')
      ).toBeVisible();

      // Fill with exactly 100 characters
      const desc100 = 'A'.repeat(100);
      await page.fill('[data-testid="nc-description"]', desc100);

      // Character counter should show 100/100
      await expect(charCounter).toContainText('100');

      // Complete other required fields
      await page.click('[data-testid="machine-status-operational"]');

      // Submit should now work (button should be enabled)
      await expect(page.locator('[data-testid="btn-submit"]')).toBeEnabled();
    });

    test('should validate NC description maximum 2000 characters', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      await page.click('[data-testid="nc-type-incident"]');
      await page.fill('[data-testid="nc-product-description"]', 'Valid product');

      // Create string longer than 2000 characters
      const longDesc = 'A'.repeat(2001);
      await page.fill('[data-testid="nc-description"]', longDesc);

      // Character counter should show overflow
      const charCounter = page.locator('[data-testid="nc-description-char-count"]');
      await expect(charCounter).toContainText('2001');

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Description cannot exceed 2000 characters')
      ).toBeVisible();
    });

    test('should require NC type selection', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill other fields but skip NC type
      await page.fill('[data-testid="nc-product-description"]', 'Valid product description');
      await page.fill(
        '[data-testid="nc-description"]',
        'Valid description exceeding one hundred character minimum requirement for BRCGS compliance and quality documentation standards in manufacturing operations.'
      );
      await page.click('[data-testid="machine-status-operational"]');

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(page.locator('text=Please select a non-conformance type')).toBeVisible();
    });

    test('should require machine status selection', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill other required fields but skip machine status
      await page.click('[data-testid="nc-type-raw-material"]');
      await page.fill('[data-testid="nc-product-description"]', 'Valid product');
      await page.fill(
        '[data-testid="nc-description"]',
        'Comprehensive description meeting the minimum one hundred character requirement for BRCGS compliance and regulatory documentation standards.'
      );

      // Try to submit - button should be disabled without machine status
      const submitBtn = page.locator('[data-testid="btn-submit"]');
      await expect(submitBtn).toBeDisabled();

      // Select machine status
      await page.click('[data-testid="machine-status-operational"]');

      // Submit button should now be enabled
      await expect(submitBtn).toBeEnabled();
    });

    test('should validate conditional field: machine down requires timestamp and downtime', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill required base fields
      await page.click('[data-testid="nc-type-finished-goods"]');
      await page.fill('[data-testid="nc-product-description"]', 'Product requiring machine repair');
      await page.fill(
        '[data-testid="nc-description"]',
        'Machine malfunction detected requiring immediate attention. Production halted to prevent further quality issues. Detailed investigation required to identify root cause and implement corrective action.'
      );

      // Select machine down
      await page.click('[data-testid="machine-status-down"]');

      // Try to submit without filling conditional fields
      await page.click('[data-testid="btn-submit"]');

      // Should show validation errors for conditional fields
      await expect(
        page.locator('text=Machine down since timestamp is required when machine is down')
      ).toBeVisible();
      await expect(
        page.locator('text=Estimated downtime is required when machine is down')
      ).toBeVisible();

      // Fill conditional fields
      const now = new Date().toISOString().slice(0, 16);
      await page.fill('input[name="machine_down_since"]', now);
      await page.fill('input[name="estimated_downtime"]', '60');

      // Add cross-contamination answer
      await page.click('[data-testid="cross-contamination-no"]');

      // Submit should work now
      await page.click('[data-testid="btn-submit"]');
      await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should validate conditional field: cross-contamination requires back tracking person', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill required fields
      await page.click('[data-testid="nc-type-wip"]');
      await page.fill('[data-testid="nc-product-description"]', 'Contaminated work in progress');
      await page.fill(
        '[data-testid="nc-description"]',
        'Cross-contamination event identified in production area requiring comprehensive back tracking investigation to determine scope and source of contamination. Immediate corrective action implemented.'
      );
      await page.click('[data-testid="machine-status-operational"]');

      // Select cross-contamination YES
      await page.click('[data-testid="cross-contamination-yes"]');

      // Try to submit without back tracking person
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Back tracking person is required when cross-contamination is detected')
      ).toBeVisible();

      // Fill back tracking person
      await page.fill('input[name="back_tracking_person"]', 'Sarah Johnson - Quality Manager');

      // Submit should work now
      await page.click('[data-testid="btn-submit"]');
      await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should validate conditional field: rework disposition requires instruction (20 chars)', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill required fields
      await page.click('[data-testid="nc-type-finished-goods"]');
      await page.fill('[data-testid="nc-product-description"]', 'Product requiring rework');
      await page.fill(
        '[data-testid="nc-description"]',
        'Minor defects identified that can be corrected through approved rework procedures. Quality inspection confirmed product integrity is maintained after corrective action is applied.'
      );
      await page.click('[data-testid="machine-status-operational"]');
      await page.click('[data-testid="cross-contamination-no"]');

      // Select rework disposition
      await page.click('[data-testid="disposition-rework"]');

      // Try to submit with too short instruction
      await page.fill('[data-testid="rework-instruction"]', 'Fix it'); // Only 6 chars

      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator(
          'text=Rework instruction must be at least 20 characters when rework is selected'
        )
      ).toBeVisible();

      // Fill with valid instruction (20+ chars)
      await page.fill(
        '[data-testid="rework-instruction"]',
        'Remove defective seals and reapply using approved materials'
      );

      // Submit should work now
      await page.click('[data-testid="btn-submit"]');
      await expect(page.locator('text=NCA submitted successfully!')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('MJC Form Validation', () => {
    test('should show validation errors when submitting empty MJC form', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Try to submit empty form
      const submitBtn = page.locator('[data-testid="btn-submit"]');

      // Submit button should be disabled
      await expect(submitBtn).toBeDisabled();
    });

    test('should validate machine equipment ID is required', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Fill other fields but skip machine ID
      await page.click('[data-testid="maintenance-category-reactive"]');
      await page.click('[data-testid="maintenance-type-mechanical"]');

      // Try to submit
      const submitBtn = page.locator('[data-testid="btn-submit"]');
      await expect(submitBtn).toBeDisabled();

      // Fill machine ID
      await page.fill('[data-testid="machine-equipment-id"]', 'TEST-MACHINE-001');

      // Button still disabled (more required fields)
      await expect(submitBtn).toBeDisabled();
    });

    test('should validate maintenance description minimum 100 characters', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Fill required fields
      await page.fill('[data-testid="machine-equipment-id"]', 'VALIDATION-TEST');
      await page.click('[data-testid="maintenance-category-planned"]');
      await page.click('[data-testid="maintenance-type-electrical"]');
      await page.click('[data-testid="machine-status-operational"]');
      await page.click('[data-testid="urgency-low"]');
      await page.click('[data-testid="temporary-repair-no"]');

      // Fill with less than 100 characters
      const shortDesc = 'Short maintenance note.'; // ~23 chars
      await page.fill('[data-testid="maintenance-description"]', shortDesc);

      // Character counter should show count
      const charCounter = page.locator('[data-testid="maintenance-description-char-count"]');
      await expect(charCounter).toContainText(`${shortDesc.length}`);

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Description must be at least 100 characters for BRCGS compliance')
      ).toBeVisible();
    });

    test('should validate maintenance description maximum 2000 characters', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Fill required fields
      await page.fill('[data-testid="machine-equipment-id"]', 'MAX-LENGTH-TEST');
      await page.click('[data-testid="maintenance-category-reactive"]');
      await page.click('[data-testid="maintenance-type-mechanical"]');
      await page.click('[data-testid="machine-status-operational"]');
      await page.click('[data-testid="urgency-medium"]');
      await page.click('[data-testid="temporary-repair-no"]');

      // Create string longer than 2000 characters
      const longDesc = 'A'.repeat(2001);
      await page.fill('[data-testid="maintenance-description"]', longDesc);

      // Character counter should show overflow
      const charCounter = page.locator('[data-testid="maintenance-description-char-count"]');
      await expect(charCounter).toContainText('2001');

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Description cannot exceed 2000 characters')
      ).toBeVisible();
    });

    test('should require all form selections (category, type, status, urgency, temp repair)', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      const submitBtn = page.locator('[data-testid="btn-submit"]');

      // Initially disabled
      await expect(submitBtn).toBeDisabled();

      // Fill machine ID
      await page.fill('[data-testid="machine-equipment-id"]', 'REQUIRED-FIELDS-TEST');
      await expect(submitBtn).toBeDisabled();

      // Fill maintenance category
      await page.click('[data-testid="maintenance-category-reactive"]');
      await expect(submitBtn).toBeDisabled();

      // Fill maintenance type
      await page.click('[data-testid="maintenance-type-mechanical"]');
      await expect(submitBtn).toBeDisabled();

      // Fill machine status
      await page.click('[data-testid="machine-status-operational"]');
      await expect(submitBtn).toBeDisabled();

      // Fill urgency
      await page.click('[data-testid="urgency-high"]');
      await expect(submitBtn).toBeDisabled();

      // Fill temporary repair
      await page.click('[data-testid="temporary-repair-no"]');
      await expect(submitBtn).toBeDisabled();

      // Fill description
      await page.fill(
        '[data-testid="maintenance-description"]',
        'Complete maintenance description exceeding minimum one hundred character requirement for BRCGS compliance validation testing purpose.'
      );

      // Now button should be enabled
      await expect(submitBtn).toBeEnabled();
    });

    test('should validate hygiene checklist incomplete blocks clearance', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Fill all required fields except hygiene checklist
      await page.fill('[data-testid="machine-equipment-id"]', 'HYGIENE-INCOMPLETE-TEST');
      await page.click('[data-testid="maintenance-category-reactive"]');
      await page.click('[data-testid="maintenance-type-mechanical"]');
      await page.click('[data-testid="machine-status-operational"]');
      await page.click('[data-testid="urgency-medium"]');
      await page.click('[data-testid="temporary-repair-no"]');
      await page.fill(
        '[data-testid="maintenance-description"]',
        'Testing hygiene checklist validation requirements. All ten items must be verified before production clearance can be granted per BRCGS standards.'
      );

      // Check only 5 out of 10 items
      await page.check('[data-testid="hygiene-check-1"]');
      await page.check('[data-testid="hygiene-check-2"]');
      await page.check('[data-testid="hygiene-check-3"]');
      await page.check('[data-testid="hygiene-check-4"]');
      await page.check('[data-testid="hygiene-check-5"]');

      // Progress indicator should show 5/10
      await expect(page.locator('text=5/10 items verified')).toBeVisible();

      // Production cleared checkbox should be disabled
      const clearanceCheckbox = page.locator('[data-testid="production-cleared"]');
      await expect(clearanceCheckbox).toBeDisabled();

      // Warning should be visible
      await expect(page.locator('text=All 10 hygiene items must be verified')).toBeVisible();

      // Fill signature fields
      await page.fill('[data-testid="clearance-qa-supervisor"]', 'Test Supervisor');
      await page.fill('[data-testid="clearance-signature"]', 'TestSig');

      // Try to submit (form is technically valid without clearance, but incomplete hygiene)
      await page.click('[data-testid="btn-submit"]');

      // Form can submit without clearance checkbox (clearance is optional)
      // But clearance checkbox CANNOT be checked without all 10 items
    });

    test('should prevent clearance without QA supervisor and signature', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Fill all required fields
      await page.fill('[data-testid="machine-equipment-id"]', 'SIGNATURE-TEST');
      await page.click('[data-testid="maintenance-category-planned"]');
      await page.click('[data-testid="maintenance-type-electrical"]');
      await page.click('[data-testid="machine-status-operational"]');
      await page.click('[data-testid="urgency-low"]');
      await page.click('[data-testid="temporary-repair-no"]');
      await page.fill(
        '[data-testid="maintenance-description"]',
        'Testing signature validation requirements for production clearance. Both QA supervisor name and digital signature must be provided when granting clearance.'
      );

      // Check all 10 hygiene items
      for (let i = 1; i <= 10; i++) {
        await page.check(`[data-testid="hygiene-check-${i}"]`);
      }

      // Clearance checkbox should now be enabled
      const clearanceCheckbox = page.locator('[data-testid="production-cleared"]');
      await expect(clearanceCheckbox).toBeEnabled();

      // Check clearance WITHOUT signature
      await clearanceCheckbox.check();

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation errors
      await expect(
        page.locator('text=Digital signature is required when granting production clearance')
      ).toBeVisible();
      await expect(
        page.locator('text=QA/Supervisor name is required when granting production clearance')
      ).toBeVisible();

      // Fill signature fields
      await page.fill('[data-testid="clearance-qa-supervisor"]', 'Mike Johnson');
      await page.fill('[data-testid="clearance-signature"]', 'MikeJ');

      // Submit again
      await page.click('[data-testid="btn-submit"]');

      // Should succeed now
      await expect(page.locator('text=MJC submitted successfully!')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should validate maintenance type "other" specification (minimum 10 chars)', async () => {
      const page = stagehand.page;
      await page.goto(`${BASE_URL}/mjc/new`);

      // Fill required fields
      await page.fill('[data-testid="machine-equipment-id"]', 'OTHER-TYPE-VALIDATION');
      await page.click('[data-testid="maintenance-category-planned"]');
      await page.click('[data-testid="maintenance-type-other"]');

      // Conditional field should appear
      const otherField = page.locator('input[name="maintenance_type_other"]');
      await expect(otherField).toBeVisible();

      // Fill with too short specification
      await otherField.fill('Hydro'); // Only 5 chars

      // Complete other fields
      await page.click('[data-testid="machine-status-operational"]');
      await page.click('[data-testid="urgency-low"]');
      await page.click('[data-testid="temporary-repair-no"]');
      await page.fill(
        '[data-testid="maintenance-description"]',
        'Testing maintenance type other validation. Specification must be at least ten characters to provide adequate detail about the maintenance category.'
      );

      // Try to submit
      await page.click('[data-testid="btn-submit"]');

      // Should show validation error
      await expect(
        page.locator('text=Please specify the maintenance type (minimum 10 characters)')
      ).toBeVisible();

      // Fix with valid length
      await otherField.fill('Hydraulic system');

      // Complete hygiene checklist
      for (let i = 1; i <= 10; i++) {
        await page.check(`[data-testid="hygiene-check-${i}"]`);
      }

      // Grant clearance
      await page.fill('[data-testid="clearance-qa-supervisor"]', 'Vernon Smith');
      await page.fill('[data-testid="clearance-signature"]', 'VernonS');
      await page.check('[data-testid="production-cleared"]');

      // Submit should work now
      await page.click('[data-testid="btn-submit"]');
      await expect(page.locator('text=MJC submitted successfully!')).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Cross-Form Validation Patterns', () => {
    test('should validate character counters work consistently across forms', async () => {
      const page = stagehand.page;

      // Test NCA character counter
      await page.goto(`${BASE_URL}/nca/new`);
      let charCounter = page.locator('[data-testid="nc-description-char-count"]');

      // Should show 0 initially
      await expect(charCounter).toContainText('0');

      // Fill with 50 characters
      const text50 = 'A'.repeat(50);
      await page.fill('[data-testid="nc-description"]', text50);
      await expect(charCounter).toContainText('50');

      // Test MJC character counter
      await page.goto(`${BASE_URL}/mjc/new`);
      charCounter = page.locator('[data-testid="maintenance-description-char-count"]');

      // Should show 0 initially
      await expect(charCounter).toContainText('0');

      // Fill with 50 characters
      await page.fill('[data-testid="maintenance-description"]', text50);
      await expect(charCounter).toContainText('50');
    });

    test('should handle form navigation without losing validation state', async () => {
      const page = stagehand.page;

      // Start on NCA form
      await page.goto(`${BASE_URL}/nca/new`);

      // Fill some invalid data
      await page.fill('[data-testid="nc-product-description"]', 'ABC'); // Too short

      // Try to submit to trigger validation
      await page.click('[data-testid="btn-submit"]');

      // Navigate to MJC
      await page.goto(`${BASE_URL}/mjc/new`);

      // Verify MJC form loads cleanly
      await expect(page.locator('[data-testid="mjc-form-title"]')).toBeVisible();

      // Navigate back to NCA
      await page.goto(`${BASE_URL}/nca/new`);

      // Form should be fresh (no previous validation errors)
      await expect(page.locator('[data-testid="nca-form-title"]')).toBeVisible();
    });

    test('should validate both forms require explicit machine status selection', async () => {
      const page = stagehand.page;

      // Test NCA
      await page.goto(`${BASE_URL}/nca/new`);
      await page.click('[data-testid="nc-type-raw-material"]');
      await page.fill('[data-testid="nc-product-description"]', 'Test product');
      await page.fill(
        '[data-testid="nc-description"]',
        'Description exceeding minimum one hundred character requirement for validation testing across multiple forms and scenarios.'
      );

      // Submit button should be disabled without machine status
      await expect(page.locator('[data-testid="btn-submit"]')).toBeDisabled();

      // Test MJC
      await page.goto(`${BASE_URL}/mjc/new`);
      await page.fill('[data-testid="machine-equipment-id"]', 'TEST-001');
      await page.click('[data-testid="maintenance-category-reactive"]');
      await page.click('[data-testid="maintenance-type-mechanical"]');
      // Skip machine status
      await page.click('[data-testid="urgency-medium"]');
      await page.click('[data-testid="temporary-repair-no"]');
      await page.fill(
        '[data-testid="maintenance-description"]',
        'Description exceeding minimum one hundred character requirement for validation testing across multiple forms and scenarios.'
      );

      // Submit button should be disabled without machine status
      await expect(page.locator('[data-testid="btn-submit"]')).toBeDisabled();
    });
  });
});
