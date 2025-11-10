/**
 * Work Order Auto-Link - Stagehand E2E Tests
 *
 * Tests automatic work order linking in NCA and MJC forms
 * Following strict TDD: These tests MUST fail until implementation exists
 *
 * @requires @browserbasehq/stagehand v3.0.1+
 * @requires OpenAI API key in OPENAI_API_KEY environment variable
 */

import { test, expect } from '@playwright/test';
import Stagehand from '@browserbasehq/stagehand';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3008';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required for Stagehand tests');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are required');
}

// Initialize Supabase client for test setup
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Schema for extracting work order field data
 */
const WorkOrderFieldSchema = z.object({
  woNumber: z.string(),
  isAutoFilled: z.boolean(),
  isReadOnly: z.boolean().optional(),
});

const WarningMessageSchema = z.object({
  hasWarning: z.boolean(),
  warningText: z.string().optional(),
});

/**
 * Test Suite: NCA Form Work Order Auto-Link
 */
test.describe('NCA Form - Work Order Auto-Link', () => {
  let stagehand: any;
  let testWorkOrderId: string | null = null;
  let testUserId: string = 'test-user-123';

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      apiKey: OPENAI_API_KEY,
      verbose: 1,
      debugDom: true,
      enableCaching: false,
    });

    await stagehand.init();

    // Setup: Create a test work order for auto-linking
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .insert({
        wo_number: `WO-TEST-${Date.now()}`,
        product: 'Test Product',
        machine_id: 'machine-001',
        operator_id: testUserId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create test work order:', error);
      throw new Error(`Test setup failed: ${error.message}`);
    }

    testWorkOrderId = workOrder.id;
  });

  test.afterEach(async () => {
    // Cleanup: Remove test work order
    if (testWorkOrderId) {
      await supabase.from('work_orders').delete().eq('id', testWorkOrderId);
    }

    await stagehand.close();
  });

  /**
   * RED: This test MUST FAIL initially
   * Expected failure: Work order field is empty or not auto-filled
   */
  test('should auto-fill work order number when opening NCA form', async ({ page }) => {
    // Navigate to NCA form
    await page.goto(`${TEST_URL}/nca/new`);
    await page.waitForLoadState('networkidle');

    // Use Stagehand to observe the work order field
    const workOrderField = await stagehand.page.act({
      action: 'observe the work order number field',
    });

    // Extract work order field data using Stagehand's extract
    const fieldData = await stagehand.page.extract({
      instruction: 'Extract the work order number from the WO Number field',
      schema: WorkOrderFieldSchema,
    });

    // ASSERTION: Work order should be auto-filled
    expect(fieldData.woNumber).toBeTruthy();
    expect(fieldData.woNumber).toContain('WO-');
    expect(fieldData.isAutoFilled).toBe(true);

    // Verify field is visible and readable
    const woInput = page.locator('[data-testid="nca-wo-number"]');
    await expect(woInput).toBeVisible();
    const value = await woInput.inputValue();
    expect(value).toContain('WO-');
  });

  /**
   * RED: This test MUST FAIL initially
   * Expected failure: NCA submission does not include wo_id
   */
  test('should link NCA to active work order on submission', async ({ page }) => {
    // Navigate to NCA form
    await page.goto(`${TEST_URL}/nca/new`);
    await page.waitForLoadState('networkidle');

    // Fill required fields using Stagehand
    await stagehand.page.act({
      action: 'select "Raw Material" as NC Type',
    });

    await stagehand.page.act({
      action: 'fill NC Product Description with "Test product for work order linking"',
    });

    await stagehand.page.act({
      action: 'fill NC Description with "This is a test non-conformance for verifying work order auto-linking functionality. The system should automatically associate this NCA with the active work order."',
    });

    await stagehand.page.act({
      action: 'select "MACHINE OPERATIONAL" as machine status',
    });

    // Submit form
    await stagehand.page.act({
      action: 'click the Submit button',
    });

    // Wait for submission success
    await page.waitForSelector('[data-testid="nca-form-title"]', { timeout: 10000 });

    // Verify NCA was created and linked to work order
    const { data: ncaRecords, error: ncaError } = await supabase
      .from('nca_records')
      .select('*, wo_id')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(ncaError).toBeNull();
    expect(ncaRecords).toBeTruthy();
    expect(ncaRecords!.length).toBeGreaterThan(0);

    // ASSERTION: NCA should have wo_id linked
    const latestNCA = ncaRecords![0];
    expect(latestNCA.wo_id).toBe(testWorkOrderId);
  });
});

/**
 * Test Suite: MJC Form Work Order Auto-Link
 */
test.describe('MJC Form - Work Order Auto-Link', () => {
  let stagehand: any;
  let testWorkOrderId: string | null = null;
  let testUserId: string = 'test-user-123';

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      apiKey: OPENAI_API_KEY,
      verbose: 1,
      debugDom: true,
      enableCaching: false,
    });

    await stagehand.init();

    // Setup: Create a test work order for auto-linking
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .insert({
        wo_number: `WO-TEST-${Date.now()}`,
        product: 'Test Product',
        machine_id: 'machine-001',
        operator_id: testUserId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create test work order:', error);
      throw new Error(`Test setup failed: ${error.message}`);
    }

    testWorkOrderId = workOrder.id;
  });

  test.afterEach(async () => {
    // Cleanup: Remove test work order
    if (testWorkOrderId) {
      await supabase.from('work_orders').delete().eq('id', testWorkOrderId);
    }

    await stagehand.close();
  });

  /**
   * RED: This test MUST FAIL initially
   * Expected failure: Work order field is empty or not auto-filled
   */
  test('should auto-fill work order number when opening MJC form', async ({ page }) => {
    // Navigate to MJC form
    await page.goto(`${TEST_URL}/mjc/new`);
    await page.waitForLoadState('networkidle');

    // Use Stagehand to observe the work order field
    const workOrderField = await stagehand.page.act({
      action: 'observe the work order number field',
    });

    // Extract work order field data using Stagehand's extract
    const fieldData = await stagehand.page.extract({
      instruction: 'Extract the work order number from the WO Number field',
      schema: WorkOrderFieldSchema,
    });

    // ASSERTION: Work order should be auto-filled
    expect(fieldData.woNumber).toBeTruthy();
    expect(fieldData.woNumber).toContain('WO-');
    expect(fieldData.isAutoFilled).toBe(true);

    // Verify field is visible and readable
    const woInput = page.locator('[data-testid="mjc-wo-number"]');
    await expect(woInput).toBeVisible();
    const value = await woInput.inputValue();
    expect(value).toContain('WO-');
  });

  /**
   * RED: This test MUST FAIL initially
   * Expected failure: MJC submission does not include wo_id
   */
  test('should link MJC to active work order on submission', async ({ page }) => {
    // Navigate to MJC form
    await page.goto(`${TEST_URL}/mjc/new`);
    await page.waitForLoadState('networkidle');

    // Fill required fields using Stagehand
    await stagehand.page.act({
      action: 'fill Jobsheet Number with "JS-TEST-001"',
    });

    await stagehand.page.act({
      action: 'fill Product Description with "Test product for MJC work order linking"',
    });

    await stagehand.page.act({
      action: 'fill Date Made with today\'s date',
    });

    await stagehand.page.act({
      action: 'fill Customer with "Test Customer"',
    });

    await stagehand.page.act({
      action: 'fill Job Description with "This is a test machine job card for verifying work order auto-linking functionality."',
    });

    // Submit form
    await stagehand.page.act({
      action: 'click the Submit button',
    });

    // Wait for submission success
    await page.waitForSelector('[data-testid="mjc-form-title"]', { timeout: 10000 });

    // Verify MJC was created and linked to work order
    const { data: mjcRecords, error: mjcError } = await supabase
      .from('mjc_records')
      .select('*, wo_id')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(mjcError).toBeNull();
    expect(mjcRecords).toBeTruthy();
    expect(mjcRecords!.length).toBeGreaterThan(0);

    // ASSERTION: MJC should have wo_id linked
    const latestMJC = mjcRecords![0];
    expect(latestMJC.wo_id).toBe(testWorkOrderId);
  });
});

/**
 * Test Suite: No Active Work Order Warning
 */
test.describe('Forms - No Active Work Order Warning', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      apiKey: OPENAI_API_KEY,
      verbose: 1,
      debugDom: true,
      enableCaching: false,
    });

    await stagehand.init();

    // Ensure no active work orders exist for test user
    await supabase
      .from('work_orders')
      .update({ status: 'completed' })
      .eq('operator_id', 'test-user-123')
      .eq('status', 'active');
  });

  test.afterEach(async () => {
    await stagehand.close();
  });

  /**
   * RED: This test MUST FAIL initially
   * Expected failure: No warning badge shown when no active work order
   */
  test('should show warning when no active work order on NCA form', async ({ page }) => {
    // Navigate to NCA form
    await page.goto(`${TEST_URL}/nca/new`);
    await page.waitForLoadState('networkidle');

    // Use Stagehand to extract warning message
    const warningData = await stagehand.page.extract({
      instruction: 'Check if there is a warning message about no active work order',
      schema: WarningMessageSchema,
    });

    // ASSERTION: Warning should be displayed
    expect(warningData.hasWarning).toBe(true);
    expect(warningData.warningText).toMatch(/no active work order/i);

    // Verify work order field is empty
    const woInput = page.locator('[data-testid="nca-wo-number"]');
    await expect(woInput).toBeVisible();
    const value = await woInput.inputValue();
    expect(value).toBe('');
  });

  /**
   * RED: This test MUST FAIL initially
   * Expected failure: No warning badge shown when no active work order
   */
  test('should show warning when no active work order on MJC form', async ({ page }) => {
    // Navigate to MJC form
    await page.goto(`${TEST_URL}/mjc/new`);
    await page.waitForLoadState('networkidle');

    // Use Stagehand to extract warning message
    const warningData = await stagehand.page.extract({
      instruction: 'Check if there is a warning message about no active work order',
      schema: WarningMessageSchema,
    });

    // ASSERTION: Warning should be displayed
    expect(warningData.hasWarning).toBe(true);
    expect(warningData.warningText).toMatch(/no active work order/i);

    // Verify work order field is empty
    const woInput = page.locator('[data-testid="mjc-wo-number"]');
    await expect(woInput).toBeVisible();
    const value = await woInput.inputValue();
    expect(value).toBe('');
  });
});
