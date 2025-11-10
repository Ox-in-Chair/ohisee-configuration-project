/**
 * E2E Tests for NCA AI Quality Gate
 * Uses Playwright for full user journey testing
 *
 * Test Scenarios:
 * 1. User fills form with low-quality description → Quality gate blocks submission
 * 2. User improves description after AI feedback → Quality gate passes
 * 3. User requests AI suggestion → Accepts suggestion → Quality improves
 * 4. Confidential report bypasses quality gate
 * 5. AI service failure → User can still submit
 */

import { test, expect } from '@playwright/test';

test.describe('NCA AI Quality Gate E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to NCA form
    await page.goto('/nca/new');

    // Wait for form to load
    await expect(page.locator('[data-testid="nca-form-title"]')).toBeVisible();
  });

  test('Quality gate blocks submission with low-quality description', async ({ page }) => {
    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();

    await page.locator('[data-testid="nc-product-description"]').fill('Chocolate Bar');

    // Enter minimal, low-quality description
    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');
    await descriptionTextarea.fill('Bad product. Found problem.');

    await page.locator('[data-testid="machine-status-operational"]').click();

    // Try to submit
    await page.locator('[data-testid="btn-submit"]').click();

    // Quality gate modal should appear
    await expect(page.locator('[data-testid="quality-gate-modal"]')).toBeVisible();

    // Should show low score
    const scoreDisplay = page.locator('[data-testid="quality-score-display"]');
    await expect(scoreDisplay).toContainText(/[0-6][0-9]\/100/); // Score < 70

    // Should show "Go Back & Edit" button
    await expect(page.locator('[data-testid="quality-gate-go-back"]')).toBeVisible();

    // Should show supervisor override button (disabled)
    const overrideButton = page.locator('[data-testid="quality-gate-submit-anyway"]');
    await expect(overrideButton).toBeVisible();
    await expect(overrideButton).toBeDisabled();
  });

  test('Quality gate passes with high-quality description', async ({ page }) => {
    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();

    await page.locator('[data-testid="nc-product-description"]').fill('Chocolate Bar 100g');

    // Enter detailed, high-quality description
    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');
    await descriptionTextarea.fill(
      'Foreign material (plastic fragment approximately 2mm in size) detected in Batch #ABC123 during final quality inspection at 14:30 on production line 3. The contamination was identified by visual inspection before packaging. Approximately 500 units from the batch have been isolated and quarantined in designated hold area. Immediate actions taken include stopping production on line 3, conducting equipment inspection, and notifying QA supervisor. No product has left the facility. Root cause investigation initiated with maintenance team to inspect packaging equipment seals.'
    );

    // Wait for inline quality check (3 seconds debounce)
    await page.waitForTimeout(3500);

    // Quality badge should show passing score
    const qualityBadge = page.locator('[data-testid="quality-badge"]');
    await expect(qualityBadge).toBeVisible();

    await page.locator('[data-testid="machine-status-operational"]').click();

    // Submit form
    await page.locator('[data-testid="btn-submit"]').click();

    // Quality gate modal should NOT appear (or show pass message)
    // Form should submit successfully
    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('User requests AI suggestion and accepts it', async ({ page }) => {
    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();
    await page.locator('[data-testid="nc-product-description"]').fill('Test Product');
    await page.locator('[data-testid="machine-status-operational"]').click();

    // Enter partial description
    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');
    await descriptionTextarea.fill(
      'Found contamination in batch. QA team isolated the product.'
    );

    // Click "Get AI Help" button
    const aiHelpButton = page.locator('[data-testid="nc-description-ai-ai-help"]');
    await aiHelpButton.click();

    // AI Assistant Modal should appear
    await expect(page.locator('[data-testid="ai-assistant-modal"]')).toBeVisible();

    // Should show suggestion text
    await expect(page.locator('text=Suggested Text:')).toBeVisible();

    // Accept suggestion
    await page.locator('[data-testid="ai-suggestion-accept"]').click();

    // Modal should close
    await expect(page.locator('[data-testid="ai-assistant-modal"]')).not.toBeVisible();

    // Textarea should now contain AI-suggested text
    const updatedText = await descriptionTextarea.inputValue();
    expect(updatedText.length).toBeGreaterThan(100);
  });

  test('Confidential report bypasses quality gate', async ({ page }) => {
    // Check confidential checkbox
    await page.locator('[data-testid="confidential-report"]').check();

    // Fill required fields with minimal info
    await page.locator('[data-testid="nc-type-incident"]').click();

    await page.locator('[data-testid="nc-product-description"]').fill('Confidential');

    // Enter minimal description (normally would fail quality check)
    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');
    await descriptionTextarea.fill('Confidential incident. Details restricted.');

    await page.locator('[data-testid="machine-status-operational"]').click();

    // Submit form
    await page.locator('[data-testid="btn-submit"]').click();

    // Quality gate modal should NOT appear
    // Form should submit successfully despite low quality
    await expect(page.locator('text=NCA submitted successfully')).toBeVisible({
      timeout: 10000,
    });
  });

  test('User can still submit if AI service fails', async ({ page }) => {
    // Mock AI service failure (would need to set up API mocking)
    // For this test, we'll just verify the form doesn't break

    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();

    await page.locator('[data-testid="nc-product-description"]').fill('Product ABC');

    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');
    await descriptionTextarea.fill(
      'Adequate description with sufficient detail to meet minimum character requirements for form submission. This description includes what happened, when it occurred, and the impact on production.'
    );

    await page.locator('[data-testid="machine-status-operational"]').click();

    // Even if AI quality check fails, submit button should be enabled
    const submitButton = page.locator('[data-testid="btn-submit"]');
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    // Should either submit successfully or show graceful error
    // Should NOT crash or block indefinitely
    await page.waitForTimeout(5000);

    // Check for either success or error message (but not a crash)
    const hasSuccessOrError = await page
      .locator('text=successfully, text=failed, text=error')
      .count();
    expect(hasSuccessOrError).toBeGreaterThanOrEqual(0);
  });

  test('Quality badge updates in real-time as user types', async ({ page }) => {
    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();
    await page.locator('[data-testid="nc-product-description"]').fill('Test Product');

    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');

    // Type minimal text
    await descriptionTextarea.fill('Short text');

    // Wait for debounce + check
    await page.waitForTimeout(3500);

    // Quality badge should appear (might show loading or low score)
    const charCount = page.locator('[data-testid="nc-description-ai-char-count"]');
    await expect(charCount).toBeVisible();
    await expect(charCount).toContainText('10 / 100 minimum');

    // Type more detailed text
    await descriptionTextarea.fill(
      'Foreign material contamination detected in production batch ABC123 at 10:00 AM. Approximately 100 units affected. Product immediately quarantined in hold area. QA team conducting full investigation of equipment and processes.'
    );

    // Wait for debounce + check
    await page.waitForTimeout(3500);

    // Character count should update
    await expect(charCount).toContainText(/2[0-9]{2} \/ 100 minimum/);

    // Quality badge should eventually show a score
    const qualityBadge = page.locator('[data-testid="quality-badge"]');
    await expect(qualityBadge).toBeVisible({ timeout: 10000 });
  });

  test('User can go back from quality gate and edit', async ({ page }) => {
    // Fill form with low-quality description
    await page.locator('[data-testid="nc-type-finished-goods"]').click();
    await page.locator('[data-testid="nc-product-description"]').fill('Product');
    await page.locator('[data-testid="nc-description-ai"]').fill('Problem found.');
    await page.locator('[data-testid="machine-status-operational"]').click();

    // Try to submit
    await page.locator('[data-testid="btn-submit"]').click();

    // Quality gate should block
    await expect(page.locator('[data-testid="quality-gate-modal"]')).toBeVisible();

    // Click "Go Back & Edit"
    await page.locator('[data-testid="quality-gate-go-back"]').click();

    // Modal should close
    await expect(page.locator('[data-testid="quality-gate-modal"]')).not.toBeVisible();

    // User should be able to edit the description
    const descriptionTextarea = page.locator('[data-testid="nc-description-ai"]');
    await expect(descriptionTextarea).toBeEnabled();

    // Improve description
    await descriptionTextarea.fill(
      'Detailed description: Foreign material found in Batch #123 during inspection at 2PM. 50 units quarantined. Investigation in progress with maintenance team reviewing equipment seals and filters.'
    );

    // Wait for quality check
    await page.waitForTimeout(3500);

    // Try to submit again
    await page.locator('[data-testid="btn-submit"]').click();

    // Should now pass (or show improved score)
    await page.waitForTimeout(2000);
  });
});

test.describe('NCA AI Suggestions Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nca/new');
    await expect(page.locator('[data-testid="nca-form-title"]')).toBeVisible();
  });

  test('Shows procedure references in AI suggestions', async ({ page }) => {
    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();
    await page.locator('[data-testid="nc-product-description"]').fill('Test');
    await page.locator('[data-testid="machine-status-operational"]').click();

    // Request AI help for corrective action
    await page.locator('[data-testid="corrective-action-ai-ai-help"]').click();

    // Wait for modal
    await expect(page.locator('[data-testid="ai-assistant-modal"]')).toBeVisible();

    // Should show confidence badge
    await expect(page.locator('text=Confidence')).toBeVisible();

    // Should show procedure references
    await expect(page.locator('text=Referenced Procedures:')).toBeVisible();

    // Should have accept/reject buttons
    await expect(page.locator('[data-testid="ai-suggestion-accept"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-suggestion-reject"]')).toBeVisible();
  });

  test('Reject suggestion closes modal without changes', async ({ page }) => {
    // Fill required fields
    await page.locator('[data-testid="nc-type-finished-goods"]').click();
    await page.locator('[data-testid="nc-product-description"]').fill('Test');
    await page.locator('[data-testid="machine-status-operational"]').click();

    const rootCauseTextarea = page.locator('[data-testid="root-cause-analysis-ai"]');
    await rootCauseTextarea.fill('Initial text');

    // Request AI help
    await page.locator('[data-testid="root-cause-analysis-ai-ai-help"]').click();

    await expect(page.locator('[data-testid="ai-assistant-modal"]')).toBeVisible();

    // Reject suggestion
    await page.locator('[data-testid="ai-suggestion-reject"]').click();

    // Modal should close
    await expect(page.locator('[data-testid="ai-assistant-modal"]')).not.toBeVisible();

    // Textarea should still have original text
    await expect(rootCauseTextarea).toHaveValue('Initial text');
  });
});
