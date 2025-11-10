/**
 * AI Quality Gate E2E Tests
 * Complete user workflows with AI assistance and quality validation
 */

import { test, expect } from '@playwright/test';

test.describe('AI Quality Gate - NCA Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to NCA form
    await page.goto('http://localhost:3008/nca/new');
    await page.waitForLoadState('networkidle');
  });

  test('Happy path: High-quality NCA submission with AI assistance', async ({ page }) => {
    // Fill Section 1: Basic Information
    await page.fill('[data-testid="location"]', 'Production Line 1');
    await page.fill('[data-testid="department"]', 'Manufacturing');

    // Fill Section 2: Non-Conformance Details
    await page.selectOption('[data-testid="nc-type"]', 'wip');

    // Type in NC Description (triggers inline quality check after debounce)
    const description = `Print registration misalignment detected on CMH-01 flexo printer at 14:30 on 2025-01-10.
Print out of specification by 3mm, exceeding ±2mm tolerance per procedure 5.6.
Operator identified issue during routine quality check.
Affected approximately 200 units in current production run.`;

    await page.fill('[data-testid="nc-description"]', description);

    // Wait for debounced quality check (3 seconds)
    await page.waitForTimeout(3500);

    // Quality badge should appear
    await expect(page.locator('[data-testid="quality-badge"]')).toBeVisible({
      timeout: 5000,
    });

    // Click "Get AI Help" for corrective action
    await page.click('[data-testid="corrective-action-ai-help"]');

    // AI modal should open
    await expect(page.locator('text=AI Suggestions')).toBeVisible({
      timeout: 10000,
    });

    // Accept AI suggestion
    await page.click('text=Accept');

    // Modal should close and text should be inserted
    await expect(page.locator('[data-testid="corrective-action"]')).not.toBeEmpty();

    // Fill remaining required fields
    await page.selectOption('[data-testid="machine-status"]', 'operational');
    await page.check('[data-testid="disposition-rework"]');

    // Submit form
    await page.click('[data-testid="submit-nca"]');

    // Deep validation runs (may take up to 30 seconds)
    await page.waitForTimeout(2000);

    // Quality score should be >= 75, so no quality gate modal
    await expect(page.locator('[data-testid="quality-gate-modal"]')).not.toBeVisible({
      timeout: 35000,
    });

    // Should navigate to success page or show confirmation
    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Quality gate blocks submission with low-quality content', async ({ page }) => {
    // Fill with minimal information
    await page.fill('[data-testid="location"]', 'Line 1');
    await page.fill('[data-testid="department"]', 'Production');
    await page.selectOption('[data-testid="nc-type"]', 'wip');

    // Insufficient description
    await page.fill('[data-testid="nc-description"]', 'Print issue');

    await page.waitForTimeout(3500);

    // Quality badge should show low score
    const badge = page.locator('[data-testid="quality-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });

    // Brief corrective action
    await page.fill('[data-testid="corrective-action"]', 'Fix it');

    await page.selectOption('[data-testid="machine-status"]', 'operational');

    // Submit
    await page.click('[data-testid="submit-nca"]');

    // Quality gate modal should appear
    await expect(page.locator('[data-testid="quality-gate-modal"]')).toBeVisible({
      timeout: 35000,
    });

    // Check quality gate content
    await expect(page.locator('text=Quality Gate')).toBeVisible();
    await expect(
      page.locator('text=Your submission does not meet the quality threshold')
    ).toBeVisible();

    // Score should be displayed
    const scoreDisplay = page.locator('[data-testid="quality-gate-score"]');
    await expect(scoreDisplay).toBeVisible();

    // "Go Back & Edit" button should be primary
    await expect(page.locator('[data-testid="go-back-edit"]')).toBeVisible();
  });

  test('User improves content after quality gate feedback', async ({ page }) => {
    // Start with low quality
    await page.fill('[data-testid="location"]', 'Line 1');
    await page.fill('[data-testid="department"]', 'Production');
    await page.selectOption('[data-testid="nc-type"]', 'wip');
    await page.fill('[data-testid="nc-description"]', 'Problem occurred');
    await page.fill('[data-testid="corrective-action"]', 'Will fix');
    await page.selectOption('[data-testid="machine-status"]', 'operational');

    // Submit
    await page.click('[data-testid="submit-nca"]');

    // Quality gate appears
    await expect(page.locator('[data-testid="quality-gate-modal"]')).toBeVisible({
      timeout: 35000,
    });

    // Click "Go Back & Edit"
    await page.click('[data-testid="go-back-edit"]');

    // Modal should close
    await expect(page.locator('[data-testid="quality-gate-modal"]')).not.toBeVisible();

    // Improve description
    const improvedDescription = `Metal fragment detected in finished product during metal detector alarm at 09:15 on 2025-01-10.
Metal detector sensitivity check passed - confirmed genuine alarm.
Fragment size approximately 2mm x 3mm, appears to be stainless steel.
Affected batch: LOT-2025-001, estimated 50 units quarantined.
Immediate line shutdown initiated per procedure 5.8.`;

    await page.fill('[data-testid="nc-description"]', improvedDescription);

    await page.waitForTimeout(3500);

    // Use AI help for improved corrective action
    await page.click('[data-testid="corrective-action-ai-help"]');
    await page.waitForSelector('text=AI Suggestions', { timeout: 10000 });
    await page.click('text=Accept');

    // Resubmit
    await page.click('[data-testid="submit-nca"]');

    // Should pass quality gate this time
    await expect(page.locator('[data-testid="quality-gate-modal"]')).not.toBeVisible({
      timeout: 35000,
    });

    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Confidential report bypasses quality gate', async ({ page }) => {
    // Check confidential checkbox
    await page.check('[data-testid="is-confidential"]');

    // Fill with minimal content
    await page.fill('[data-testid="location"]', 'Office');
    await page.fill('[data-testid="department"]', 'HR');
    await page.selectOption('[data-testid="nc-type"]', 'incident');
    await page.fill('[data-testid="nc-description"]', 'Confidential incident report');
    await page.selectOption('[data-testid="machine-status"]', 'operational');

    // Submit
    await page.click('[data-testid="submit-nca"]');

    // Quality gate should NOT appear
    await expect(page.locator('[data-testid="quality-gate-modal"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Should submit successfully
    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('AI inline quality check updates in real-time', async ({ page }) => {
    await page.fill('[data-testid="location"]', 'Line 1');
    await page.fill('[data-testid="department"]', 'Production');
    await page.selectOption('[data-testid="nc-type"]', 'wip');

    // Start with poor description
    await page.fill('[data-testid="nc-description"]', 'Issue');
    await page.waitForTimeout(3500);

    // Quality badge should show (low score)
    await expect(page.locator('[data-testid="quality-badge"]')).toBeVisible({
      timeout: 5000,
    });

    // Get initial score
    const initialBadge = page.locator('[data-testid="quality-badge"]');
    const initialScore = await initialBadge.getAttribute('data-score');

    // Improve description
    await page.fill(
      '[data-testid="nc-description"]',
      `Comprehensive description with specific details:
      - Event occurred at 14:30 on 2025-01-10
      - Print registration error on CMH-01
      - Measured deviation: 3mm (tolerance: ±2mm)
      - Root cause: Calibration drift detected
      - Approximately 200 units affected`
    );

    await page.waitForTimeout(3500);

    // Quality badge should update with better score
    const updatedBadge = page.locator('[data-testid="quality-badge"]');
    const updatedScore = await updatedBadge.getAttribute('data-score');

    // New score should be higher than initial
    expect(Number(updatedScore)).toBeGreaterThan(Number(initialScore));
  });

  test('Supervisor override records audit trail', async ({ page }) => {
    // Fill with low quality content
    await page.fill('[data-testid="location"]', 'Line 1');
    await page.fill('[data-testid="department"]', 'Production');
    await page.selectOption('[data-testid="nc-type"]', 'incident');
    await page.fill('[data-testid="nc-description"]', 'Urgent issue needs immediate submission');
    await page.fill('[data-testid="corrective-action"]', 'Will address');
    await page.selectOption('[data-testid="machine-status"]', 'down');

    // Submit
    await page.click('[data-testid="submit-nca"]');

    // Quality gate appears
    await expect(page.locator('[data-testid="quality-gate-modal"]')).toBeVisible({
      timeout: 35000,
    });

    // Click "Submit Anyway" (supervisor override)
    await page.click('[data-testid="submit-anyway"]');

    // Supervisor credentials modal should appear
    await expect(page.locator('text=Supervisor Override Required')).toBeVisible({
      timeout: 5000,
    });

    // Enter supervisor credentials
    await page.fill('[data-testid="supervisor-id"]', 'supervisor-001');
    await page.fill('[data-testid="override-reason"]', 'Urgent production issue requiring immediate action');

    // Confirm override
    await page.click('[data-testid="confirm-override"]');

    // Should submit with override logged
    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });

    // Override should be recorded in audit log (verify in database test)
  });
});

test.describe('AI Quality Gate - MJC Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3008/mjc/new');
    await page.waitForLoadState('networkidle');
  });

  test('MJC with machine-specific AI suggestions', async ({ page }) => {
    // Select machine
    await page.selectOption('[data-testid="machine-equipment"]', 'CMH-02 Slitter/Rewinder');

    // Describe problem
    await page.fill(
      '[data-testid="description-required"]',
      'Tension control malfunction during high-speed operation'
    );

    await page.waitForTimeout(3500);

    // Click AI help
    await page.click('[data-testid="maintenance-performed-ai-help"]');

    // AI should provide machine-specific suggestions
    await expect(page.locator('text=AI Suggestions')).toBeVisible({ timeout: 10000 });

    // Suggestions should reference machine-specific components
    const suggestionText = await page.locator('[data-testid="ai-suggestion-text"]').textContent();
    expect(suggestionText).toContain('tension');

    await page.click('text=Accept');

    // Complete form
    await page.selectOption('[data-testid="maintenance-category"]', 'reactive');
    await page.check('[data-testid="maintenance-type-mechanical"]');
    await page.selectOption('[data-testid="urgency"]', 'high');
    await page.selectOption('[data-testid="machine-status"]', 'operational');

    await page.click('[data-testid="submit-mjc"]');

    await expect(page.locator('text=MJC submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Food contact machine triggers hygiene checklist', async ({ page }) => {
    // Select food contact machine
    await page.selectOption('[data-testid="machine-equipment"]', 'CMH-01 Flexo Printer');

    await page.fill('[data-testid="description-required"]', 'Ink system maintenance required');
    await page.fill('[data-testid="maintenance-performed"]', 'Cleaned ink delivery system and replaced worn seals');

    await page.selectOption('[data-testid="maintenance-category"]', 'planned');
    await page.check('[data-testid="maintenance-type-mechanical"]');
    await page.selectOption('[data-testid="urgency"]', 'medium');
    await page.selectOption('[data-testid="machine-status"]', 'operational');

    await page.click('[data-testid="submit-mjc"]');

    // Hygiene checklist modal should appear
    await expect(page.locator('text=Hygiene Clearance Required')).toBeVisible({
      timeout: 5000,
    });

    // Checklist should have 10 items
    const checklistItems = page.locator('[data-testid^="hygiene-check-"]');
    await expect(checklistItems).toHaveCount(10);

    // Complete hygiene checklist
    for (let i = 1; i <= 10; i++) {
      await page.check(`[data-testid="hygiene-check-${i}"]`);
    }

    await page.click('[data-testid="confirm-hygiene-clearance"]');

    await expect(page.locator('text=MJC submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Safety keywords detected in maintenance description', async ({ page }) => {
    await page.selectOption('[data-testid="machine-equipment"]', 'CMH-03 Die Cutter');

    // Include safety keywords
    const description = `Performed lockout/tagout procedure before maintenance.
    Replaced safety guard that was damaged.
    Verified all safety interlocks functional.
    Emergency stop tested and operational.`;

    await page.fill('[data-testid="description-required"]', description);

    await page.waitForTimeout(3500);

    // Quality badge should recognize safety compliance
    await expect(page.locator('[data-testid="quality-badge"]')).toBeVisible({
      timeout: 5000,
    });

    // Safety indicator should appear
    await expect(page.locator('[data-testid="safety-keywords-detected"]')).toBeVisible();
  });
});

test.describe('AI Quality Gate - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3008/nca/new');
  });

  test('Graceful degradation when AI service is unavailable', async ({ page }) => {
    // Mock AI service failure by intercepting network request
    await page.route('**/api/ai/**', (route) => {
      route.abort('failed');
    });

    await page.fill('[data-testid="location"]', 'Line 1');
    await page.fill('[data-testid="department"]', 'Production');
    await page.selectOption('[data-testid="nc-type"]', 'wip');
    await page.fill('[data-testid="nc-description"]', 'Test description');

    await page.waitForTimeout(3500);

    // Quality badge should not appear or show error
    await expect(page.locator('[data-testid="quality-badge"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Form should still be submittable
    await page.fill('[data-testid="corrective-action"]', 'Manual entry without AI');
    await page.selectOption('[data-testid="machine-status"]', 'operational');

    await page.click('[data-testid="submit-nca"]');

    // Should show warning but allow submission
    await expect(
      page.locator('text=AI quality check unavailable. Proceeding without validation.')
    ).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('Rate limiting shows appropriate message', async ({ page }) => {
    // Make multiple rapid AI requests to trigger rate limit
    for (let i = 0; i < 12; i++) {
      await page.click('[data-testid="corrective-action-ai-help"]');
      await page.waitForTimeout(100);

      // Close modal if it opens
      const closeButton = page.locator('[data-testid="close-ai-modal"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }

    // 11th request should show rate limit message
    await expect(
      page.locator('text=AI assistant is busy. Please try again in a moment.')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI Quality Gate - Performance Requirements', () => {
  test('Inline quality check completes within 2 seconds', async ({ page }) => {
    await page.goto('http://localhost:3008/nca/new');

    await page.fill('[data-testid="nc-description"]', 'Test description for performance check');

    const startTime = Date.now();

    await page.waitForTimeout(3500); // Debounce

    // Wait for quality badge
    await page.waitForSelector('[data-testid="quality-badge"]', { timeout: 5000 });

    const endTime = Date.now();
    const responseTime = endTime - startTime - 3500; // Subtract debounce time

    // Response should be under 2000ms
    expect(responseTime).toBeLessThan(2000);
  });

  test('Deep validation completes within 30 seconds', async ({ page }) => {
    await page.goto('http://localhost:3008/nca/new');

    // Fill complete form
    await page.fill('[data-testid="location"]', 'Production Line 1');
    await page.fill('[data-testid="department"]', 'Manufacturing');
    await page.selectOption('[data-testid="nc-type"]', 'wip');
    await page.fill('[data-testid="nc-description"]', 'Complete detailed description');
    await page.fill('[data-testid="corrective-action"]', 'Comprehensive corrective action plan');
    await page.selectOption('[data-testid="machine-status"]', 'operational');

    const startTime = Date.now();

    await page.click('[data-testid="submit-nca"]');

    // Wait for either success or quality gate modal
    await Promise.race([
      page.waitForSelector('text=NCA submitted successfully', { timeout: 35000 }),
      page.waitForSelector('[data-testid="quality-gate-modal"]', { timeout: 35000 }),
    ]);

    const endTime = Date.now();
    const validationTime = endTime - startTime;

    // Validation should complete within 30 seconds
    expect(validationTime).toBeLessThan(30000);
  });
});
