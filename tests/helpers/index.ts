/**
 * Test Helpers Index
 * Centralized export for all test utilities
 */

// Supabase Test Client
export {
  createTestClient,
  verifyConnection,
  createAndVerifyTestClient,
} from './supabase-test-client';

// Test Data Factory
export {
  createTestUser,
  createTestUsersByRole,
  createTestMachine,
  createTestWorkOrder,
  createTestMJC,
  createTestNCA,
  createHygieneChecklist,
  createTestSignature,
  createTestScenario,
  createTestUsers,
  createTestMJCs,
  createTestNCAs,
} from './test-data-factory';

export type {
  TestUserOptions,
  TestMachineOptions,
  TestWorkOrderOptions,
  TestMJCOptions,
  TestNCAOptions,
  TestSignatureOptions,
  TestScenario,
} from './test-data-factory';

// Cleanup Utilities
export {
  cleanupTestData,
  cleanupTestDataAfterTimestamp,
  cleanupAllTestData,
  verifyCleanup,
} from './cleanup-utils';

export type {
  CleanupResult,
  TestDataIds,
} from './cleanup-utils';
