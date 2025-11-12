/**
 * MJC (Maintenance Job Card) Workflow E2E Tests
 *
 * Tests complete MJC lifecycle including hygiene checklist and clearance.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestContext,
  destroyTestContext,
  captureFailureScreenshot,
  createTestMachine,
  type TestContext,
} from '../fixtures';
import {
  login,
  createMJC,
  navigateTo,
  typeIntoField,
  clickButton,
  selectFromDropdown,
  toggleCheckbox,
  isElementVisible,
  waitForToast,
  getElementText,
} from '../helpers';
import { E2E_CONFIG, TEST_DATA } from '../config';

describe('MJC Workflows', () => {
  let context: TestContext;
  let testMachineId: string;

  beforeEach(async () => {
    context = await createTestContext();

    // Create test machine
    const machine = await createTestMachine();
    testMachineId = machine.id;

    // Log in before each test
    const testUser = E2E_CONFIG.testUsers.operator;
    await login(context.stagehand, testUser.email, testUser.password);
  }, 45000);

  afterEach(async () => {
    await destroyTestContext(context);
  });

  describe('MJC Creation', () => {
    it('should create a new MJC with required fields', async () => {
      try {
        const { stagehand } = context;

        const mjcId = await createMJC(stagehand, {
          machineId: testMachineId,
          description: TEST_DATA.sampleMJC.description,
          workPerformed: TEST_DATA.sampleMJC.workPerformed,
        });

        // Verify MJC was created
        expect(mjcId).toBeTruthy();
        context.testDataIds.mjcs.push(mjcId);

        // Verify redirect to MJC detail page
        expect(stagehand.page.url()).toContain(`/mjc/${mjcId}`);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-creation');
        throw error;
      }
    }, 60000);

    it('should save MJC as draft', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        // Fill only description (minimum for draft)
        await typeIntoField(
          stagehand,
          'mjc-description',
          TEST_DATA.sampleMJC.description
        );

        // Save as draft
        await clickButton(stagehand, 'btn-save-draft', 'Click save draft button');

        // Wait for success
        await waitForToast(stagehand, 'draft');

        // Verify redirect
        await stagehand.page.waitForURL('**/mjc/**', { timeout: 10000 });
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-save-draft');
        throw error;
      }
    }, 45000);

    it('should show validation errors for missing required fields', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        // Try to submit without filling required fields
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Should show validation errors
        const hasError = await stagehand.page
          .locator('text=/required|must|field/i')
          .isVisible()
          .catch(() => false);

        expect(hasError).toBe(true);

        // Should not redirect
        expect(stagehand.page.url()).toContain('/mjc/new');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-validation');
        throw error;
      }
    }, 45000);

    it('should enforce minimum description length (50 characters)', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        // Try short description
        await typeIntoField(stagehand, 'mjc-description', 'Short');

        // Try to submit
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Should show length validation error
        const hasError = await stagehand.page
          .locator('text=/50 character|minimum|too short/i')
          .isVisible()
          .catch(() => false);

        expect(hasError).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-min-length');
        throw error;
      }
    }, 45000);
  });

  describe('Hygiene Checklist', () => {
    it('should display all 10 hygiene checklist items', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        // Navigate to hygiene checklist section
        await stagehand.page.locator('text=/hygiene checklist/i').scrollIntoViewIfNeeded();

        // Verify 10 checklist items are present
        const checklistItems = await stagehand.page.locator('[data-testid^="hygiene-item-"]').count();

        expect(checklistItems).toBeGreaterThanOrEqual(10);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-hygiene-checklist');
        throw error;
      }
    }, 45000);

    it('should require all 10 items to be verified before clearance', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        // Fill required fields
        await typeIntoField(
          stagehand,
          'mjc-description',
          TEST_DATA.sampleMJC.description
        );

        // Try to grant clearance without checking all items
        await toggleCheckbox(stagehand, 'hygiene-item-1', true);
        await toggleCheckbox(stagehand, 'hygiene-item-2', true);
        // Leave others unchecked

        // Try to submit
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Should show error about incomplete hygiene checklist
        const hasError = await stagehand.page
          .locator('text=/hygiene|checklist|verified|complete/i')
          .isVisible()
          .catch(() => false);

        expect(hasError).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-hygiene-incomplete');
        throw error;
      }
    }, 45000);

    it('should allow submission when all 10 items are verified', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        // Fill required fields
        await typeIntoField(
          stagehand,
          'mjc-description',
          TEST_DATA.sampleMJC.description
        );

        // Check all 10 hygiene items
        for (let i = 1; i <= 10; i++) {
          await toggleCheckbox(stagehand, `hygiene-item-${i}`, true);
        }

        // Should now be able to submit
        await clickButton(stagehand, 'btn-submit', 'Click submit button');

        // Should redirect successfully
        await stagehand.page.waitForURL('**/mjc/**', { timeout: 10000 });
        expect(stagehand.page.url()).toContain('/mjc/');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-hygiene-complete');
        throw error;
      }
    }, 60000);
  });

  describe('Hygiene Clearance', () => {
    it('should only allow QA supervisor to grant hygiene clearance', async () => {
      try {
        const { stagehand } = context;

        // Create MJC as operator
        const mjcId = await createMJC(stagehand, {
          description: TEST_DATA.sampleMJC.description,
        });
        context.testDataIds.mjcs.push(mjcId);

        // Try to grant clearance as operator (should fail)
        await navigateTo(stagehand, `/mjc/${mjcId}`);

        const canGrantClearance = await isElementVisible(
          stagehand,
          'grant-clearance-button'
        ).catch(() => false);

        // Operator should NOT see clearance button
        expect(canGrantClearance).toBe(false);

        // Log out and log in as QA supervisor
        await stagehand.act('Click logout');
        await login(
          stagehand,
          E2E_CONFIG.testUsers.qaSupervisor.email,
          E2E_CONFIG.testUsers.qaSupervisor.password
        );

        // Navigate to same MJC
        await navigateTo(stagehand, `/mjc/${mjcId}`);

        // QA supervisor SHOULD see clearance button
        const qaCanGrant = await isElementVisible(
          stagehand,
          'grant-clearance-button'
        ).catch(() => false);

        expect(qaCanGrant).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-clearance-role');
        throw error;
      }
    }, 60000);

    it('should grant hygiene clearance with signature', async () => {
      try {
        const { stagehand } = context;

        // Log in as QA supervisor
        await stagehand.act('Click logout');
        await login(
          stagehand,
          E2E_CONFIG.testUsers.qaSupervisor.email,
          E2E_CONFIG.testUsers.qaSupervisor.password
        );

        // Create MJC with all hygiene items verified
        await navigateTo(stagehand, '/mjc/new');
        await typeIntoField(
          stagehand,
          'mjc-description',
          TEST_DATA.sampleMJC.description
        );

        // Verify all hygiene items
        for (let i = 1; i <= 10; i++) {
          await toggleCheckbox(stagehand, `hygiene-item-${i}`, true);
        }

        await clickButton(stagehand, 'btn-submit');
        await stagehand.page.waitForURL('**/mjc/**');

        // Grant clearance
        await clickButton(stagehand, 'grant-clearance-button');

        // Should require signature
        const hasSignature = await isElementVisible(
          stagehand,
          'clearance-signature'
        ).catch(() => false);

        expect(hasSignature).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-grant-clearance');
        throw error;
      }
    }, 60000);
  });

  describe('Temporary Repairs', () => {
    it('should set 14-day deadline for temporary repairs', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        await typeIntoField(
          stagehand,
          'mjc-description',
          TEST_DATA.sampleMJC.description
        );

        // Select temporary repair
        await toggleCheckbox(
          stagehand,
          'temporary-repair',
          true,
          'Check temporary repair'
        );

        // Should show close-out deadline field (14 days)
        const hasDeadline = await isElementVisible(
          stagehand,
          'closeout-deadline'
        ).catch(() => false);

        expect(hasDeadline).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-temporary-repair');
        throw error;
      }
    }, 45000);
  });

  describe('MJC Register View', () => {
    it('should display MJC register with filters', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/register');

        // Verify register loaded
        const hasTable = await isElementVisible(stagehand, 'mjc-table')
          .catch(() => stagehand.page.locator('table').isVisible());

        expect(hasTable).toBe(true);

        // Verify filters are present
        const hasFilters = await isElementVisible(stagehand, 'filter-status')
          .catch(() => stagehand.page.locator('[role="combobox"]').isVisible());

        expect(hasFilters).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-register-view');
        throw error;
      }
    }, 45000);
  });

  describe('MJC View and Details', () => {
    it('should view MJC details page', async () => {
      try {
        const { stagehand } = context;

        // Create MJC first
        const mjcId = await createMJC(stagehand, {
          description: TEST_DATA.sampleMJC.description,
        });

        context.testDataIds.mjcs.push(mjcId);

        // Navigate to details
        await navigateTo(stagehand, `/mjc/${mjcId}`);

        // Verify details are visible
        const hasDetails = await isElementVisible(stagehand, 'mjc-details')
          .catch(() => stagehand.page.locator('h1').isVisible());

        expect(hasDetails).toBe(true);

        // Verify description is displayed
        const description = await getElementText(stagehand, 'mjc-description')
          .catch(() => '');

        expect(description).toContain(TEST_DATA.sampleMJC.description);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-view-details');
        throw error;
      }
    }, 60000);
  });

  describe('Parts Used Tracking', () => {
    it('should track parts used in maintenance', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/mjc/new');

        await typeIntoField(
          stagehand,
          'mjc-description',
          TEST_DATA.sampleMJC.description
        );

        // Fill parts used
        await typeIntoField(
          stagehand,
          'parts-used',
          TEST_DATA.sampleMJC.partsUsed,
          'Type parts used'
        );

        // Verify parts field accepts input
        const partsValue = await stagehand.page
          .locator('[data-testid="parts-used"]')
          .inputValue();

        expect(partsValue).toContain(TEST_DATA.sampleMJC.partsUsed);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'mjc-parts-tracking');
        throw error;
      }
    }, 45000);
  });
});
