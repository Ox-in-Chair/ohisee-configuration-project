/**
 * Cleanup Utilities
 * Delete test data after tests to maintain clean test database
 *
 * IMPORTANT: Deletes in reverse dependency order (children before parents)
 * to avoid foreign key constraint violations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

// =============================================================================
// Type Definitions
// =============================================================================

export interface CleanupResult {
  success: boolean;
  deletedCounts: {
    mjcs: number;
    ncas: number;
    workOrders: number;
    machines: number;
    users: number;
  };
  errors: string[];
}

export interface TestDataIds {
  mjcIds?: string[];
  ncaIds?: string[];
  workOrderIds?: string[];
  machineIds?: string[];
  userIds?: string[];
}

// =============================================================================
// Individual Table Cleanup Functions
// =============================================================================

/**
 * Deletes MJCs by ID
 * @param client - Supabase client with service role
 * @param ids - Array of MJC IDs to delete
 * @returns {Promise<number>} Number of records deleted
 * @throws {Error} If deletion fails
 */
async function deleteMJCs(
  client: SupabaseClient<Database>,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const { data, error } = await client
    .from('mjcs')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete MJCs: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Deletes NCAs by ID
 * @param client - Supabase client with service role
 * @param ids - Array of NCA IDs to delete
 * @returns {Promise<number>} Number of records deleted
 * @throws {Error} If deletion fails
 */
async function deleteNCAs(
  client: SupabaseClient<Database>,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const { data, error } = await client
    .from('ncas')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete NCAs: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Deletes work orders by ID
 * @param client - Supabase client with service role
 * @param ids - Array of work order IDs to delete
 * @returns {Promise<number>} Number of records deleted
 * @throws {Error} If deletion fails
 */
async function deleteWorkOrders(
  client: SupabaseClient<Database>,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const { data, error } = await client
    .from('work_orders')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete work orders: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Deletes machines by ID
 * @param client - Supabase client with service role
 * @param ids - Array of machine IDs to delete
 * @returns {Promise<number>} Number of records deleted
 * @throws {Error} If deletion fails
 */
async function deleteMachines(
  client: SupabaseClient<Database>,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const { data, error } = await client
    .from('machines')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete machines: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Deletes users by ID
 * @param client - Supabase client with service role
 * @param ids - Array of user IDs to delete
 * @returns {Promise<number>} Number of records deleted
 * @throws {Error} If deletion fails
 */
async function deleteUsers(
  client: SupabaseClient<Database>,
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const { data, error } = await client
    .from('users')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete users: ${error.message}`);
  }

  return data?.length ?? 0;
}

// =============================================================================
// Main Cleanup Function
// =============================================================================

/**
 * Cleans up test data in correct order (reverse FK dependencies)
 * Order: MJCs/NCAs → Work Orders → Machines → Users
 *
 * @param client - Supabase client with service role
 * @param testIds - IDs of test data to delete
 * @returns {Promise<CleanupResult>} Result with counts and errors
 */
export async function cleanupTestData(
  client: SupabaseClient<Database>,
  testIds: TestDataIds
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: true,
    deletedCounts: {
      mjcs: 0,
      ncas: 0,
      workOrders: 0,
      machines: 0,
      users: 0,
    },
    errors: [],
  };

  // Delete in reverse dependency order to avoid FK violations

  // 1. Delete MJCs (child of work_orders, machines, users)
  if (testIds.mjcIds && testIds.mjcIds.length > 0) {
    try {
      result.deletedCounts.mjcs = await deleteMJCs(client, testIds.mjcIds);
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Failed to delete MJCs'
      );
    }
  }

  // 2. Delete NCAs (child of work_orders, users)
  if (testIds.ncaIds && testIds.ncaIds.length > 0) {
    try {
      result.deletedCounts.ncas = await deleteNCAs(client, testIds.ncaIds);
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Failed to delete NCAs'
      );
    }
  }

  // 3. Delete Work Orders (child of machines, users)
  if (testIds.workOrderIds && testIds.workOrderIds.length > 0) {
    try {
      result.deletedCounts.workOrders = await deleteWorkOrders(
        client,
        testIds.workOrderIds
      );
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error
          ? error.message
          : 'Failed to delete work orders'
      );
    }
  }

  // 4. Delete Machines (no children left)
  if (testIds.machineIds && testIds.machineIds.length > 0) {
    try {
      result.deletedCounts.machines = await deleteMachines(
        client,
        testIds.machineIds
      );
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Failed to delete machines'
      );
    }
  }

  // 5. Delete Users (no children left)
  if (testIds.userIds && testIds.userIds.length > 0) {
    try {
      result.deletedCounts.users = await deleteUsers(client, testIds.userIds);
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Failed to delete users'
      );
    }
  }

  return result;
}

// =============================================================================
// Batch Cleanup Utilities
// =============================================================================

/**
 * Deletes all test data created after a specific timestamp
 * Useful for cleaning up failed test runs
 *
 * @param client - Supabase client with service role
 * @param afterTimestamp - ISO timestamp to delete after
 * @returns {Promise<CleanupResult>} Result with counts and errors
 */
export async function cleanupTestDataAfterTimestamp(
  client: SupabaseClient<Database>,
  afterTimestamp: string
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: true,
    deletedCounts: {
      mjcs: 0,
      ncas: 0,
      workOrders: 0,
      machines: 0,
      users: 0,
    },
    errors: [],
  };

  try {
    // 1. Delete MJCs
    const { data: mjcData, error: mjcError } = await client
      .from('mjcs')
      .delete()
      .gte('created_at', afterTimestamp)
      .select('id');

    if (mjcError) throw new Error(`MJCs: ${mjcError.message}`);
    result.deletedCounts.mjcs = mjcData?.length ?? 0;

    // 2. Delete NCAs
    const { data: ncaData, error: ncaError } = await client
      .from('ncas')
      .delete()
      .gte('created_at', afterTimestamp)
      .select('id');

    if (ncaError) throw new Error(`NCAs: ${ncaError.message}`);
    result.deletedCounts.ncas = ncaData?.length ?? 0;

    // 3. Delete Work Orders
    const { data: woData, error: woError } = await client
      .from('work_orders')
      .delete()
      .gte('created_at', afterTimestamp)
      .select('id');

    if (woError) throw new Error(`Work Orders: ${woError.message}`);
    result.deletedCounts.workOrders = woData?.length ?? 0;

    // 4. Delete Machines
    const { data: machineData, error: machineError } = await client
      .from('machines')
      .delete()
      .gte('created_at', afterTimestamp)
      .select('id');

    if (machineError) throw new Error(`Machines: ${machineError.message}`);
    result.deletedCounts.machines = machineData?.length ?? 0;

    // 5. Delete Users
    const { data: userData, error: userError } = await client
      .from('users')
      .delete()
      .gte('created_at', afterTimestamp)
      .select('id');

    if (userError) throw new Error(`Users: ${userError.message}`);
    result.deletedCounts.users = userData?.length ?? 0;
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error
        ? error.message
        : 'Failed to cleanup by timestamp'
    );
  }

  return result;
}

/**
 * Deletes all test data with test email pattern
 * Pattern: test-*@test.com or *-test@*.com
 *
 * @param client - Supabase client with service role
 * @returns {Promise<CleanupResult>} Result with counts and errors
 */
export async function cleanupAllTestData(
  client: SupabaseClient<Database>
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: true,
    deletedCounts: {
      mjcs: 0,
      ncas: 0,
      workOrders: 0,
      machines: 0,
      users: 0,
    },
    errors: [],
  };

  try {
    // Find all test users
    const { data: testUsers, error: userFindError } = await client
      .from('users')
      .select('id')
      .like('email', '%test%')
      .returns<{ id: string }[]>();

    if (userFindError) throw new Error(`Find users: ${userFindError.message}`);

    if (!testUsers || testUsers.length === 0) {
      return result; // No test data found
    }

    const testUserIds = testUsers.map((u) => u.id);

    // Delete all data created by test users
    return await cleanupTestData(client, {
      userIds: testUserIds,
      // Note: ON DELETE CASCADE should handle child records
    });
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error
        ? error.message
        : 'Failed to cleanup all test data'
    );
  }

  return result;
}

// =============================================================================
// Verification Utilities
// =============================================================================

/**
 * Verifies that test data was successfully deleted
 * @param client - Supabase client
 * @param testIds - IDs that should be deleted
 * @returns {Promise<boolean>} True if all data deleted
 */
export async function verifyCleanup(
  client: SupabaseClient<Database>,
  testIds: TestDataIds
): Promise<boolean> {
  try {
    // Check MJCs
    if (testIds.mjcIds && testIds.mjcIds.length > 0) {
      const { data: mjcs } = await client
        .from('mjcs')
        .select('id')
        .in('id', testIds.mjcIds);
      if (mjcs && mjcs.length > 0) return false;
    }

    // Check NCAs
    if (testIds.ncaIds && testIds.ncaIds.length > 0) {
      const { data: ncas } = await client
        .from('ncas')
        .select('id')
        .in('id', testIds.ncaIds);
      if (ncas && ncas.length > 0) return false;
    }

    // Check Work Orders
    if (testIds.workOrderIds && testIds.workOrderIds.length > 0) {
      const { data: workOrders } = await client
        .from('work_orders')
        .select('id')
        .in('id', testIds.workOrderIds);
      if (workOrders && workOrders.length > 0) return false;
    }

    // Check Machines
    if (testIds.machineIds && testIds.machineIds.length > 0) {
      const { data: machines } = await client
        .from('machines')
        .select('id')
        .in('id', testIds.machineIds);
      if (machines && machines.length > 0) return false;
    }

    // Check Users
    if (testIds.userIds && testIds.userIds.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('id')
        .in('id', testIds.userIds);
      if (users && users.length > 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}
