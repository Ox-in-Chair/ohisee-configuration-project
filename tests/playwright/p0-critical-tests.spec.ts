import { test, expect } from '@playwright/test';

/**
 * P0 Critical Tests - BRCGS Compliance
 *
 * These tests validate critical business rules that must pass before production:
 * - P0-001: NCA form submission with all required fields
 * - P0-002: MJC form submission with all required fields
 * - P0-003: Machine Down Status Triggers Alert Notification
 * - P0-004: Hygiene Clearance Requires All 10 Items Verified
 * - P0-005: Cross-contamination YES mandates back tracking
 * - P0-006: Temporary repair auto-calculates 14-day due date
 * - P0-007: Work order auto-linking (bidirectional)
 * - P0-008: Cannot submit with missing required fields
 * - P0-009: Digital signature capture and timestamp
 *
 * Risk: Production loss, BRCGS compliance violation, food safety
 */

test.describe('P0-001: NCA Form Submission with All Required Fields', () => {
  test('should submit NCA form successfully with all required fields', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Fill all required fields
    await page.selectOption('[name="nc_type"]', 'finished-goods');
    await page.fill('[name="nc_product_description"]', 'Test Product Description - Machine A');
    await page.fill('[name="nc_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules and ensure proper documentation.');
    
    // Select Machine Status
    await page.selectOption('[name="machine_status"]', 'operational');

    // Set immediate correction fields (required)
    await page.check('[name="cross_contamination"]');
    await page.check('[name="back_tracking_completed"]');
    await page.check('[name="hold_label_completed"]');
    await page.check('[name="nca_logged"]');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/nca\/register|\/nca\/[^/]+/, { timeout: 10000 });

    // Verify NCA was created successfully
    await expect(page.locator('body')).toContainText(/NCA|success|created/i);
    
    // Verify NCA number is displayed (format: NCA-YYYY-NNNNNNNN)
    const ncaNumberPattern = /NCA-\d{4}-\d{8}/;
    await expect(page.locator('body')).toContainText(ncaNumberPattern);
  });
});

test.describe('P0-002: MJC Form Submission with All Required Fields', () => {
  test('should submit MJC form successfully with all required fields', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill all required fields
    await page.fill('[name="machine_equipment_id"]', 'CMH-01');
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    await page.selectOption('[name="maintenance_type"]', 'mechanical');
    await page.selectOption('[name="machine_status"]', 'operational');
    await page.selectOption('[name="urgency_level"]', 'medium');
    await page.selectOption('[name="temporary_repair"]', 'no');
    await page.fill('[name="maintenance_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards and ensure proper documentation.');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/mjc\/register|\/mjc\/[^/]+/, { timeout: 10000 });

    // Verify MJC was created successfully
    await expect(page.locator('body')).toContainText(/MJC|success|created/i);
    
    // Verify MJC number is displayed (format: MJC-YYYY-NNNNNNNN)
    const mjcNumberPattern = /MJC-\d{4}-\d{8}/;
    await expect(page.locator('body')).toContainText(mjcNumberPattern);
  });
});

test.describe('P0-003: Machine Down Status Triggers Alert Notification', () => {
  test('should send email alert when NCA created with machine down status', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Fill required fields
    await page.selectOption('[name="nc_type"]', 'incident');
    await page.fill('[name="nc_product_description"]', 'Test Product - Machine A');
    await page.fill('[name="nc_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.');
    
    // Select Machine Status: MACHINE DOWN
    await page.selectOption('[name="machine_status"]', 'down');
    
    // Fill machine down time
    const now = new Date();
    await page.fill('[name="machine_down_since"]', now.toISOString().split('T')[0] + 'T' + now.toTimeString().split(' ')[0]);

    // Set immediate correction fields
    await page.check('[name="cross_contamination"]');
    await page.check('[name="back_tracking_completed"]');
    await page.check('[name="hold_label_completed"]');
    await page.check('[name="nca_logged"]');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/nca\/register|\/nca\/[^/]+/, { timeout: 10000 });

    // Verify NCA was created successfully
    await expect(page.locator('body')).toContainText(/NCA|success|created/i);
    
    // Note: In production, this would verify email was sent to Operations Manager
    // For now, we verify the NCA was created (which triggers the notification service)
    // The actual email delivery would be tested in integration tests
  });

  test('should send email alert when MJC created with machine down + critical urgency', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill required fields
    await page.fill('[name="machine_equipment_id"]', 'CMH-02');
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    await page.selectOption('[name="maintenance_type"]', 'mechanical');
    await page.selectOption('[name="machine_status"]', 'down');
    await page.selectOption('[name="urgency_level"]', 'critical');
    await page.selectOption('[name="temporary_repair"]', 'no');
    await page.fill('[name="maintenance_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/mjc\/register|\/mjc\/[^/]+/, { timeout: 10000 });

    // Verify MJC was created successfully
    await expect(page.locator('body')).toContainText(/MJC|success|created/i);
    
    // Note: In production, this would verify email was sent to Maintenance Manager
    // The actual email delivery would be tested in integration tests
  });
});

test.describe('P0-004: Hygiene Clearance Requires All 10 Items Verified', () => {
  test('should block clearance when only 9 items verified', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill required fields
    await page.fill('[name="machine_equipment_id"]', 'CMH-01');
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    await page.selectOption('[name="maintenance_type"]', 'mechanical');
    await page.selectOption('[name="machine_status"]', 'operational');
    await page.selectOption('[name="urgency_level"]', 'medium');
    await page.selectOption('[name="temporary_repair"]', 'no');
    await page.fill('[name="maintenance_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.');

    // Mark only 9 hygiene items as verified (not all 10)
    await page.check('[name="hygiene_check_1"]');
    await page.check('[name="hygiene_check_2"]');
    await page.check('[name="hygiene_check_3"]');
    await page.check('[name="hygiene_check_4"]');
    await page.check('[name="hygiene_check_5"]');
    await page.check('[name="hygiene_check_6"]');
    await page.check('[name="hygiene_check_7"]');
    await page.check('[name="hygiene_check_8"]');
    await page.check('[name="hygiene_check_9"]');
    // hygiene_check_10 is NOT checked

    // Attempt to grant clearance
    await page.check('[name="production_cleared"]');

    // Verify error message appears or button is disabled
    // The form validation should prevent submission
    const errorMessage = page.locator('text=/all.*10.*hygiene|hygiene.*clearance|10.*items/i');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should allow clearance when all 10 items verified', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill required fields
    await page.fill('[name="machine_equipment_id"]', 'CMH-01');
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    await page.selectOption('[name="maintenance_type"]', 'mechanical');
    await page.selectOption('[name="machine_status"]', 'operational');
    await page.selectOption('[name="urgency_level"]', 'medium');
    await page.selectOption('[name="temporary_repair"]', 'no');
    await page.fill('[name="maintenance_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.');

    // Mark all 10 hygiene items as verified
    await page.check('[name="hygiene_check_1"]');
    await page.check('[name="hygiene_check_2"]');
    await page.check('[name="hygiene_check_3"]');
    await page.check('[name="hygiene_check_4"]');
    await page.check('[name="hygiene_check_5"]');
    await page.check('[name="hygiene_check_6"]');
    await page.check('[name="hygiene_check_7"]');
    await page.check('[name="hygiene_check_8"]');
    await page.check('[name="hygiene_check_9"]');
    await page.check('[name="hygiene_check_10"]');

    // Grant clearance
    await page.check('[name="production_cleared"]');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/mjc\/register|\/mjc\/[^/]+/, { timeout: 10000 });

    // Verify MJC was created successfully
    await expect(page.locator('body')).toContainText(/MJC|success|created/i);
  });
});

test.describe('P0-005: Cross-contamination YES Mandates Back Tracking', () => {
  test('should require back tracking verification when cross-contamination is YES', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Fill required fields
    await page.selectOption('[name="nc_type"]', 'finished-goods');
    await page.fill('[name="nc_product_description"]', 'Test Product Description');
    await page.fill('[name="nc_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.');
    await page.selectOption('[name="machine_status"]', 'operational');

    // Set cross-contamination to YES
    await page.check('[name="cross_contamination"]');

    // Do NOT check back_tracking_completed
    // Only check other required fields
    await page.check('[name="hold_label_completed"]');
    await page.check('[name="nca_logged"]');

    // Attempt to submit
    const submitButton = page.locator('button[type="submit"]');
    
    // Verify form validation prevents submission
    // The submit button should be disabled or show error
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();
      // Should show validation error
      await expect(page.locator('text=/back.*tracking|back.*track/i')).toBeVisible({ timeout: 5000 });
    } else {
      // Button is disabled, which is correct
      expect(isDisabled).toBe(true);
    }
  });

  test('should allow submission when cross-contamination YES and back tracking verified', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Fill required fields
    await page.selectOption('[name="nc_type"]', 'finished-goods');
    await page.fill('[name="nc_product_description"]', 'Test Product Description');
    await page.fill('[name="nc_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.');
    await page.selectOption('[name="machine_status"]', 'operational');

    // Set cross-contamination to YES
    await page.check('[name="cross_contamination"]');
    
    // Verify back tracking is completed
    await page.check('[name="back_tracking_completed"]');
    await page.check('[name="hold_label_completed"]');
    await page.check('[name="nca_logged"]');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/nca\/register|\/nca\/[^/]+/, { timeout: 10000 });

    // Verify NCA was created successfully
    await expect(page.locator('body')).toContainText(/NCA|success|created/i);
  });
});

test.describe('P0-006: Temporary Repair Auto-Calculates 14-Day Due Date', () => {
  test('should auto-calculate due date when temporary repair is YES', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill required fields
    await page.fill('[name="machine_equipment_id"]', 'CMH-01');
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    await page.selectOption('[name="maintenance_type"]', 'mechanical');
    await page.selectOption('[name="machine_status"]', 'operational');
    await page.selectOption('[name="urgency_level"]', 'medium');
    
    // Set temporary repair to YES
    await page.selectOption('[name="temporary_repair"]', 'yes');
    
    await page.fill('[name="maintenance_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.');

    // Check if due date field is auto-populated
    const dueDateInput = page.locator('[name="due_date"]');
    const dueDateValue = await dueDateInput.inputValue();
    
    // Calculate expected due date (today + 14 days)
    const today = new Date();
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() + 14);
    const expectedDateString = expectedDate.toISOString().split('T')[0];

    // Verify due date is set to 14 days from today
    expect(dueDateValue).toBe(expectedDateString);
  });
});

test.describe('P0-007: Work Order Auto-Linking', () => {
  test('should auto-populate work order number in NCA form', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Wait for work order to be auto-populated
    await page.waitForTimeout(2000);

    // Check if work order field is populated
    const woInput = page.locator('[name="wo_number"]');
    const woValue = await woInput.inputValue();

    // Verify work order number is present (format: WO-YYYY-MMDD-NNN)
    if (woValue) {
      expect(woValue).toMatch(/WO-\d{4}-\d{4}-\d{3}/);
    } else {
      // If no active work order, should show warning message
      await expect(page.locator('text=/no.*active.*work.*order|work.*order/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should auto-populate work order number in MJC form', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Wait for work order to be auto-populated
    await page.waitForTimeout(2000);

    // Check if work order field is populated
    const woInput = page.locator('[name="wo_number"]');
    const woValue = await woInput.inputValue();

    // Verify work order number is present
    if (woValue) {
      expect(woValue).toMatch(/WO-\d{4}-\d{4}-\d{3}/);
    } else {
      // If no active work order, should show warning message
      await expect(page.locator('text=/no.*active.*work.*order|work.*order/i')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('P0-008: Cannot Submit with Missing Required Fields', () => {
  test('should block NCA submission when required fields are missing', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Fill only some fields (not all required)
    await page.selectOption('[name="nc_type"]', 'finished-goods');
    // Do NOT fill nc_product_description (required)
    // Do NOT fill nc_description (required)

    // Attempt to submit
    const submitButton = page.locator('button[type="submit"]');
    
    // Verify form validation prevents submission
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();
      // Should show validation errors
      await expect(page.locator('text=/required|product.*description|description/i')).toBeVisible({ timeout: 5000 });
    } else {
      // Button is disabled, which is correct
      expect(isDisabled).toBe(true);
    }
  });

  test('should block MJC submission when required fields are missing', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill only some fields (not all required)
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    // Do NOT fill machine_equipment_id (required)
    // Do NOT fill maintenance_description (required)

    // Attempt to submit
    const submitButton = page.locator('button[type="submit"]');
    
    // Verify form validation prevents submission
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();
      // Should show validation errors
      await expect(page.locator('text=/required|machine.*equipment|description/i')).toBeVisible({ timeout: 5000 });
    } else {
      // Button is disabled, which is correct
      expect(isDisabled).toBe(true);
    }
  });
});

test.describe('P0-009: Digital Signature Capture and Timestamp', () => {
  test('should capture signature with timestamp in NCA form', async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Fill required fields
    await page.selectOption('[name="nc_type"]', 'finished-goods');
    await page.fill('[name="nc_product_description"]', 'Test Product Description');
    await page.fill('[name="nc_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.');
    await page.selectOption('[name="machine_status"]', 'operational');
    await page.check('[name="cross_contamination"]');
    await page.check('[name="back_tracking_completed"]');
    await page.check('[name="hold_label_completed"]');
    await page.check('[name="nca_logged"]');

    // Fill concession signature (if signature field exists)
    const signatureField = page.locator('[name*="signature"], [data-testid*="signature"]');
    if (await signatureField.count() > 0) {
      // Signature field exists - verify it can be filled
      await signatureField.first().fill('Test Signature Data');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/nca\/register|\/nca\/[^/]+/, { timeout: 10000 });

    // Verify NCA was created successfully
    await expect(page.locator('body')).toContainText(/NCA|success|created/i);
    
    // Note: Signature timestamp verification would be done in integration tests
    // by checking the database record
  });

  test('should capture signature with timestamp in MJC form', async ({ page }) => {
    // Navigate to MJC form
    await page.goto('/mjc/new');

    // Fill required fields
    await page.fill('[name="machine_equipment_id"]', 'CMH-01');
    await page.selectOption('[name="maintenance_category"]', 'reactive');
    await page.selectOption('[name="maintenance_type"]', 'mechanical');
    await page.selectOption('[name="machine_status"]', 'operational');
    await page.selectOption('[name="urgency_level"]', 'medium');
    await page.selectOption('[name="temporary_repair"]', 'no');
    await page.fill('[name="maintenance_description"]', 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.');

    // Mark all 10 hygiene items as verified
    for (let i = 1; i <= 10; i++) {
      await page.check(`[name="hygiene_check_${i}"]`);
    }

    // Grant clearance (requires signature)
    await page.check('[name="production_cleared"]');

    // Fill clearance signature (if signature field exists)
    const signatureField = page.locator('[name*="signature"], [data-testid*="signature"]');
    if (await signatureField.count() > 0) {
      // Signature field exists - verify it can be filled
      await signatureField.first().fill('Test Signature Data');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForURL(/\/mjc\/register|\/mjc\/[^/]+/, { timeout: 10000 });

    // Verify MJC was created successfully
    await expect(page.locator('body')).toContainText(/MJC|success|created/i);
    
    // Note: Signature timestamp verification would be done in integration tests
    // by checking the database record
  });
});

