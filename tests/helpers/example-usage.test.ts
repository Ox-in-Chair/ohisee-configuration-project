/**
 * Example Test Using Test Helpers
 * Demonstrates best practices for integration testing with Supabase
 *
 * Run with: npm test or jest
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  createTestMJC,
  createTestNCA,
  createTestMachine,
  createTestWorkOrder,
  createTestScenario,
  createHygieneChecklist,
  cleanupTestData,
  verifyCleanup,
  type TestDataIds,
} from './index';

describe('Test Helpers Example Usage', () => {
  // Setup: Create Supabase client once for all tests
  const supabase = createTestClient();
  const testIds: TestDataIds = {
    userIds: [],
    machineIds: [],
    workOrderIds: [],
    mjcIds: [],
    ncaIds: [],
  };

  // Cleanup: Delete all test data after tests complete
  afterAll(async () => {
    const result = await cleanupTestData(supabase, testIds);
    console.log('Cleanup result:', result);

    // Note: MJCs and NCAs are immutable records (BRCGS requirement) and cannot be deleted
    // due to RLS policies and foreign key constraints. This is expected behavior.
    // Additionally, users and work orders cannot be deleted if they have associated MJCs/NCAs
    // due to FK constraints. The cleanup function will attempt deletion but may fail.
    // We don't fail the test if cleanup fails - this is expected for immutable records.
    
    // Since cleanup failures are expected for immutable records (BRCGS requirement),
    // we don't verify cleanup success. The test helpers themselves are what's being tested,
    // not the cleanup functionality.
  });

  // =============================================================================
  // Example 1: Simple User Creation
  // =============================================================================

  test('should create a test user', async () => {
    // Create test user data
    const userData = createTestUser({ role: 'operator' });

    // Insert into database
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.role).toBe('operator');

    // Track for cleanup
    if (data?.id) {
      testIds.userIds!.push(data.id);
    }
  });

  // =============================================================================
  // Example 2: MJC Creation with User
  // =============================================================================

  test('should create MJC with valid user', async () => {
    // 1. Create user first
    const userData = createTestUser({ role: 'maintenance-technician' });
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    expect(userError).toBeNull();
    expect(user).toBeDefined();

    if (!user) throw new Error('User creation failed');

    // Track user for cleanup
    testIds.userIds!.push(user.id);

    // 2. Create MJC for that user
    const mjcData = createTestMJC(user.id, {
      department: 'maintenance',
      urgency: 'critical',
      maintenance_type_electrical: true,
    });

    const { data: mjc, error: mjcError } = await supabase
      .from('mjcs')
      .insert(mjcData)
      .select()
      .single();

    expect(mjcError).toBeNull();
    expect(mjc).toBeDefined();
    expect(mjc?.urgency).toBe('critical');
    expect(mjc?.raised_by_user_id).toBe(user.id);

    // Track MJC for cleanup
    if (mjc?.id) {
      testIds.mjcIds!.push(mjc.id);
    }
  });

  // =============================================================================
  // Example 3: NCA Creation with Validation
  // =============================================================================

  test('should create NCA with minimum description length', async () => {
    // 1. Create user
    const userData = createTestUser({ role: 'qa-supervisor' });
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    expect(userError).toBeNull();
    if (!user) throw new Error('User creation failed');
    testIds.userIds!.push(user.id);

    // 2. Create NCA with custom description
    // Note: cross_contamination=true requires back tracking fields, so we'll test without it
    // Note: machine_status='down' requires machine_down_since timestamp
    const ncaData = createTestNCA(user.id, {
      nc_type: 'finished-goods',
      nc_description: 'A'.repeat(100), // Exactly minimum length
      machine_status: 'operational', // Changed from 'down' to avoid constraint violation
      cross_contamination: false, // Set to false to avoid constraint violation
    });

    const { data: nca, error: ncaError } = await supabase
      .from('ncas')
      .insert(ncaData)
      .select()
      .single();

    expect(ncaError).toBeNull();
    expect(nca).toBeDefined();
    expect(nca?.nc_description.length).toBeGreaterThanOrEqual(100);
    expect(nca?.cross_contamination).toBe(false); // Changed from true to false

    // Track NCA for cleanup
    if (nca?.id) {
      testIds.ncaIds!.push(nca.id);
    }
  });

  // =============================================================================
  // Example 4: Complete Test Scenario (User + Machine + WO + MJC)
  // =============================================================================

  test('should create complete test scenario', async () => {
    // 1. Generate complete scenario
    const scenario = createTestScenario();

    // 2. Insert user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(scenario.user)
      .select()
      .single();

    expect(userError).toBeNull();
    if (!user) throw new Error('User creation failed');
    testIds.userIds!.push(user.id);

    // 3. Insert machine
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .insert(scenario.machine)
      .select()
      .single();

    expect(machineError).toBeNull();
    if (!machine) throw new Error('Machine creation failed');
    testIds.machineIds!.push(machine.id);

    // 4. Insert work order (with actual user and machine IDs)
    const woData = {
      ...scenario.workOrder,
      operator_id: user.id,
      machine_id: machine.id,
    };
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .insert(woData)
      .select()
      .single();

    expect(woError).toBeNull();
    if (!workOrder) throw new Error('Work order creation failed');
    testIds.workOrderIds!.push(workOrder.id);

    // 5. Insert MJC (with actual IDs)
    const mjcData = {
      ...scenario.mjc,
      raised_by_user_id: user.id,
      created_by: user.id,
      machine_id: machine.id,
      wo_id: workOrder.id,
    };
    const { data: mjc, error: mjcError } = await supabase
      .from('mjcs')
      .insert(mjcData)
      .select()
      .single();

    expect(mjcError).toBeNull();
    expect(mjc).toBeDefined();
    expect(mjc?.wo_id).toBe(workOrder.id);
    expect(mjc?.machine_id).toBe(machine.id);

    if (mjc?.id) {
      testIds.mjcIds!.push(mjc.id);
    }
  });

  // =============================================================================
  // Example 5: Hygiene Checklist (BRCGS Compliance)
  // =============================================================================

  test('should create MJC with complete hygiene checklist', async () => {
    // 1. Create user
    const userData = createTestUser({ role: 'maintenance-manager' });
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    expect(userError).toBeNull();
    if (!user) throw new Error('User creation failed');
    testIds.userIds!.push(user.id);

    // 2. Create hygiene checklist (all items)
    const hygieneChecklist = createHygieneChecklist(false);
    expect(hygieneChecklist).toHaveLength(10); // BRCGS requires 10 items

    // 3. Create MJC with checklist
    const mjcData = createTestMJC(user.id, {
      maintenance_category: 'planned',
    });

    const { data: mjc, error: mjcError } = await supabase
      .from('mjcs')
      .insert({
        ...mjcData,
        hygiene_checklist: hygieneChecklist,
      })
      .select()
      .single();

    expect(mjcError).toBeNull();
    expect(mjc).toBeDefined();
    expect(mjc?.hygiene_checklist).toHaveLength(10);
    expect(mjc?.hygiene_checklist?.[0].item).toBe('All Excess Grease & Oil Removed');

    if (mjc?.id) {
      testIds.mjcIds!.push(mjc.id);
    }
  });

  // =============================================================================
  // Example 6: Update Operations
  // =============================================================================

  test('should update MJC status', async () => {
    // 1. Create user and MJC
    const userData = createTestUser({ role: 'operator' });
    const { data: user } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (!user) throw new Error('User creation failed');
    testIds.userIds!.push(user.id);

    const mjcData = createTestMJC(user.id, { status: 'draft' });
    const { data: mjc } = await supabase
      .from('mjcs')
      .insert(mjcData)
      .select()
      .single();

    if (!mjc) throw new Error('MJC creation failed');
    testIds.mjcIds!.push(mjc.id);

    // 2. Update status to 'open'
    const { data: updatedMJC, error: updateError } = await supabase
      .from('mjcs')
      .update({ status: 'open' })
      .eq('id', mjc.id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updatedMJC?.status).toBe('open');
  });

  // =============================================================================
  // Example 7: Query with Filters
  // =============================================================================

  test('should query MJCs by department', async () => {
    // 1. Create user and multiple MJCs in different departments
    const userData = createTestUser({ role: 'team-leader' });
    const { data: user } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (!user) throw new Error('User creation failed');
    testIds.userIds!.push(user.id);

    const mjc1 = createTestMJC(user.id, { department: 'pouching' });
    const mjc2 = createTestMJC(user.id, { department: 'spouting' });

    const { data: mjcs } = await supabase
      .from('mjcs')
      .insert([mjc1, mjc2])
      .select();

    if (mjcs) {
      testIds.mjcIds!.push(...mjcs.map((m) => m.id));
    }

    // 2. Query only pouching department
    const { data: pouchingMJCs, error: queryError } = await supabase
      .from('mjcs')
      .select('*')
      .eq('department', 'pouching')
      .eq('raised_by_user_id', user.id);

    expect(queryError).toBeNull();
    expect(pouchingMJCs).toBeDefined();
    expect(pouchingMJCs?.length).toBeGreaterThanOrEqual(1);
    expect(pouchingMJCs?.every((m) => m.department === 'pouching')).toBe(true);
  });
});
