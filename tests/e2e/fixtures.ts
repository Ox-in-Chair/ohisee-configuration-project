/**
 * E2E Test Fixtures
 *
 * Provides test setup, teardown, and data management
 * for Stagehand browser automation tests.
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { E2E_CONFIG } from './config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

/**
 * Test user data structure
 */
export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
  name: string;
}

/**
 * Test context that's passed to each test
 */
export interface TestContext {
  stagehand: Stagehand;
  testUserId?: string;
  testDataIds: {
    ncas: string[];
    mjcs: string[];
    workOrders: string[];
  };
}

/**
 * Initialize Stagehand browser for testing
 */
export async function setupBrowser(): Promise<Stagehand> {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    verbose: E2E_CONFIG.stagehand.debugAI ? 1 : 0,
    headless: E2E_CONFIG.headless,
  });

  await stagehand.init();

  // Set viewport
  await stagehand.page.setViewportSize(E2E_CONFIG.browser.viewport);

  return stagehand;
}

/**
 * Clean up browser instance
 */
export async function teardownBrowser(stagehand: Stagehand): Promise<void> {
  if (stagehand) {
    await stagehand.close();
  }
}

/**
 * Create Supabase client for test data management
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured for E2E tests');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Set up test user in database
 * Creates a user with specific role for testing
 */
export async function setupTestUser(role: string): Promise<TestUser> {
  const supabase = createTestSupabaseClient();

  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `test-${role}-${timestamp}@e2e-test.kangopak.com`;
  const testPassword = 'TestPassword123!';

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Update user role in users table
  const { error: updateError } = await supabase
    .from('users')
    .update({ role })
    .eq('id', authData.user.id);

  if (updateError) {
    throw new Error(`Failed to update user role: ${updateError.message}`);
  }

  return {
    id: authData.user.id,
    email: testEmail,
    password: testPassword,
    role,
    name: `Test ${role}`,
  };
}

/**
 * Clean up test user from database
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  if (!E2E_CONFIG.database.cleanupAfterTests) {
    return;
  }

  const supabase = createTestSupabaseClient();

  // Delete auth user (cascade will handle related records)
  await supabase.auth.admin.deleteUser(userId);
}

/**
 * Create test work order
 */
export async function createTestWorkOrder(userId: string) {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      wo_number: `E2E-TEST-${Date.now()}`,
      product_name: 'Test Product',
      shift: 'Day',
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test work order: ${error.message}`);
  }

  return data;
}

/**
 * Create test machine
 */
export async function createTestMachine() {
  const supabase = createTestSupabaseClient();

  const { data, error } = await supabase
    .from('machines')
    .insert({
      name: `Test Machine ${Date.now()}`,
      department: 'test',
      status: 'operational',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test machine: ${error.message}`);
  }

  return data;
}

/**
 * Clean up test data created during tests
 */
export async function cleanupTestData(context: TestContext): Promise<void> {
  if (!E2E_CONFIG.database.cleanupAfterTests || E2E_CONFIG.database.preserveTestData) {
    return;
  }

  const supabase = createTestSupabaseClient();

  // Clean up NCAs
  if (context.testDataIds.ncas.length > 0) {
    await supabase.from('ncas').delete().in('id', context.testDataIds.ncas);
  }

  // Clean up MJCs
  if (context.testDataIds.mjcs.length > 0) {
    await supabase.from('mjcs').delete().in('id', context.testDataIds.mjcs);
  }

  // Clean up Work Orders
  if (context.testDataIds.workOrders.length > 0) {
    await supabase.from('work_orders').delete().in('id', context.testDataIds.workOrders);
  }

  // Clean up test user if exists
  if (context.testUserId) {
    await cleanupTestUser(context.testUserId);
  }
}

/**
 * Create test context for each test
 */
export async function createTestContext(): Promise<TestContext> {
  const stagehand = await setupBrowser();

  return {
    stagehand,
    testDataIds: {
      ncas: [],
      mjcs: [],
      workOrders: [],
    },
  };
}

/**
 * Destroy test context after test
 */
export async function destroyTestContext(context: TestContext): Promise<void> {
  await cleanupTestData(context);
  await teardownBrowser(context.stagehand);
}

/**
 * Take screenshot on test failure
 */
export async function captureFailureScreenshot(
  stagehand: Stagehand,
  testName: string
): Promise<void> {
  if (!E2E_CONFIG.screenshotOnFailure) {
    return;
  }

  const timestamp = Date.now();
  const filename = `${testName.replace(/\s+/g, '-')}-${timestamp}.png`;
  const path = `${E2E_CONFIG.screenshotPath}/${filename}`;

  await stagehand.page.screenshot({ path, fullPage: true });
  console.log(`Screenshot saved: ${path}`);
}
