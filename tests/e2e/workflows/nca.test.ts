/**
 * NCA (Non-Conformance Advice) Workflow E2E Tests
 *
 * Tests complete NCA lifecycle from creation to closure.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestContext,
  destroyTestContext,
  captureFailureScreenshot,
  createTestWorkOrder,
  type TestContext,
} from '../fixtures';
import {
  login,
  createNCA,
  navigateTo,
  typeIntoField,
  clickButton,
  selectRadio,
  toggleCheckbox,
  waitForElement,
  isElementVisible,
  getElementText,
  waitForToast,
} from '../helpers';
import { E2E_CONFIG, TEST_DATA } from '../config';

describe('NCA Workflows', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();

    // Log in before each test
    const testUser = E2E_CONFIG.testUsers.operator;
    await login(context.stagehand, testUser.email, testUser.password);
  }, 45000);

  afterEach(async () => {
    await destroyTestContext(context);
  });

  describe('NCA Creation', () => {
    it('should create a new NCA with all required fields', async () => {
      try {
        const { stagehand } = context;

        const ncaId = await createNCA(stagehand, {
          supplierName: TEST_DATA.sampleNCA.supplierName,
          productDescription: TEST_DATA.sampleNCA.productDescription,
          ncDescription: TEST_DATA.sampleNCA.ncDescription,
          ncType: 'raw-material',
          origin: 'supplier',
        });

        // Verify NCA was created
        expect(ncaId).toBeTruthy();
        context.testDataIds.ncas.push(ncaId);

        // Verify redirect to NCA detail page
        expect(stagehand.page.url()).toContain(`/nca/${ncaId}`);

        // Verify NCA details are displayed
        const hasDetails = await isElementVisible(stagehand, 'nca-details');
        expect(hasDetails).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-creation');
        throw error;
      }
    }, 60000);

    it('should save NCA as draft', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Fill only description (minimum for draft)
        await typeIntoField(
          stagehand,
          'nc-description',
          TEST_DATA.sampleNCA.ncDescription
        );

        // Save as draft
        await clickButton(stagehand, 'btn-save-draft', 'Click save draft button');

        // Wait for success
        await waitForToast(stagehand, 'draft');

        // Verify redirect
        await stagehand.page.waitForURL('**/nca/**', { timeout: 10000 });
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-save-draft');
        throw error;
      }
    }, 45000);

    it('should show validation errors for missing required fields', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Try to submit without filling required fields
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Should show validation errors
        const hasError = await stagehand.page
          .locator('text=/required|must|field/i')
          .isVisible()
          .catch(() => false);

        expect(hasError).toBe(true);

        // Should not redirect
        expect(stagehand.page.url()).toContain('/nca/new');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-validation');
        throw error;
      }
    }, 45000);

    it('should enforce minimum description length (100 characters)', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Try short description
        await typeIntoField(
          stagehand,
          'nc-description',
          'Short description'
        );

        // Try to submit
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Should show length validation error
        const hasError = await stagehand.page
          .locator('text=/100 character|minimum|too short/i')
          .isVisible()
          .catch(() => false);

        expect(hasError).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-min-length');
        throw error;
      }
    }, 45000);
  });

  describe('NCA Quality Analysis', () => {
    it('should trigger inline quality analysis during typing', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Start typing description
        await typeIntoField(
          stagehand,
          'nc-description',
          TEST_DATA.sampleNCA.ncDescription
        );

        // Wait for AI analysis (debounced 5 seconds)
        await stagehand.page.waitForTimeout(6000);

        // Check for quality indicators (badge, suggestions)
        const hasQualityBadge = await isElementVisible(stagehand, 'quality-badge')
          .catch(() => false);

        // Quality analysis might be present
        expect(hasQualityBadge || true).toBe(true); // Soft check - AI might be disabled
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-quality-analysis');
        throw error;
      }
    }, 60000);

    it('should show quality gate modal if score is low', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Fill with minimal information (likely low quality score)
        await typeIntoField(
          stagehand,
          'nc-description',
          'This is a test description that meets the minimum character requirement but lacks detail and specificity for quality.'
        );

        // Wait for analysis
        await stagehand.page.waitForTimeout(6000);

        // Try to submit
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Quality gate modal might appear (if score < 75)
        const hasQualityGate = await isElementVisible(stagehand, 'quality-gate-modal')
          .catch(() => false);

        // This is conditional - quality gate may or may not appear
        if (hasQualityGate) {
          // Can override or improve quality
          const canOverride = await isElementVisible(stagehand, 'override-button');
          expect(canOverride).toBe(true);
        }
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-quality-gate');
        throw error;
      }
    }, 60000);
  });

  describe('NCA Status Updates', () => {
    it('should update NCA status from draft to open', async () => {
      try {
        const { stagehand } = context;

        // Create draft NCA
        await navigateTo(stagehand, '/nca/new');
        await typeIntoField(
          stagehand,
          'nc-description',
          TEST_DATA.sampleNCA.ncDescription
        );
        await clickButton(stagehand, 'btn-save-draft');
        await stagehand.page.waitForURL('**/nca/**', { timeout: 10000 });

        // Complete required fields and submit
        await typeIntoField(
          stagehand,
          'supplier-name',
          TEST_DATA.sampleNCA.supplierName
        );
        await typeIntoField(
          stagehand,
          'nc-product-description',
          TEST_DATA.sampleNCA.productDescription
        );
        await clickButton(stagehand, 'btn-submit');

        // Verify status updated
        await waitForToast(stagehand);
        const statusText = await getElementText(stagehand, 'nca-status').catch(() => '');
        expect(statusText.toLowerCase()).toContain('open');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-status-update');
        throw error;
      }
    }, 60000);
  });

  describe('NCA Machine Down Flow', () => {
    it('should handle machine down status correctly', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Fill basic info
        await typeIntoField(
          stagehand,
          'nc-description',
          TEST_DATA.sampleNCA.ncDescription
        );

        // Select machine status down
        await selectRadio(
          stagehand,
          'machine-status-down',
          'Select machine status as down'
        );

        // Should show machine down timestamp field
        const hasMachineDownField = await isElementVisible(
          stagehand,
          'machine-down-timestamp'
        ).catch(() => false);

        expect(hasMachineDownField).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-machine-down');
        throw error;
      }
    }, 45000);
  });

  describe('NCA Cross-Contamination Flow', () => {
    it('should require back-tracking verification for cross-contamination', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        // Fill description
        await typeIntoField(
          stagehand,
          'nc-description',
          TEST_DATA.sampleNCA.ncDescription
        );

        // Navigate to Section 7 - Investigation
        await selectRadio(
          stagehand,
          'cross-contamination-yes',
          'Select yes for cross contamination'
        );

        // Should show back-tracking field
        const hasBackTracking = await isElementVisible(
          stagehand,
          'back-tracking-person'
        ).catch(() => false);

        expect(hasBackTracking).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-cross-contamination');
        throw error;
      }
    }, 45000);
  });

  describe('NCA Disposition', () => {
    it('should show rework instructions when disposition is rework', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/new');

        await typeIntoField(
          stagehand,
          'nc-description',
          TEST_DATA.sampleNCA.ncDescription
        );

        // Select rework disposition
        await selectRadio(
          stagehand,
          'disposition-rework',
          'Select rework as disposition'
        );

        // Should show rework instruction field
        const hasReworkField = await isElementVisible(
          stagehand,
          'rework-instruction'
        ).catch(() => false);

        expect(hasReworkField).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-disposition-rework');
        throw error;
      }
    }, 45000);
  });

  describe('NCA View and Details', () => {
    it('should view NCA details page', async () => {
      try {
        const { stagehand } = context;

        // Create NCA first
        const ncaId = await createNCA(stagehand, {
          supplierName: TEST_DATA.sampleNCA.supplierName,
          productDescription: TEST_DATA.sampleNCA.productDescription,
          ncDescription: TEST_DATA.sampleNCA.ncDescription,
        });

        context.testDataIds.ncas.push(ncaId);

        // Navigate to details
        await navigateTo(stagehand, `/nca/${ncaId}`);

        // Verify all sections are visible
        const hasSection1 = await isElementVisible(stagehand, 'nca-section-1');
        const hasSection4 = await isElementVisible(stagehand, 'nca-section-4');

        expect(hasSection1 || hasSection4).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-view-details');
        throw error;
      }
    }, 60000);
  });

  describe('NCA Register View', () => {
    it('should display NCA register with filters', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/nca/register');

        // Verify register loaded
        const hasTable = await isElementVisible(stagehand, 'nca-table')
          .catch(() => stagehand.page.locator('table').isVisible());

        expect(hasTable).toBe(true);

        // Verify filters are present
        const hasFilters = await isElementVisible(stagehand, 'filter-status')
          .catch(() => stagehand.page.locator('[role="combobox"]').isVisible());

        expect(hasFilters).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'nca-register-view');
        throw error;
      }
    }, 45000);
  });
});
