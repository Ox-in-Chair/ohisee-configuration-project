/**
 * E2E Test Configuration for Stagehand
 *
 * Configuration for AI-powered browser automation tests
 * using Stagehand framework with Playwright.
 */

export const E2E_CONFIG = {
  // Base URL for the application
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3008',

  // Test timeout (30 seconds default)
  timeout: parseInt(process.env.E2E_TIMEOUT || '30000'),

  // Browser display mode
  headless: process.env.E2E_HEADED !== 'true',

  // Slow motion for debugging (milliseconds between actions)
  slowMo: process.env.E2E_SLOW_MO ? parseInt(process.env.E2E_SLOW_MO) : 0,

  // Video recording path (null to disable)
  videoPath: process.env.E2E_VIDEO === 'true' ? './test-results/videos' : null,

  // Screenshot settings
  screenshotOnFailure: process.env.E2E_SCREENSHOT !== 'false',
  screenshotPath: './test-results/screenshots',

  // Stagehand AI configuration
  stagehand: {
    // Enable AI-powered element detection
    enableAI: process.env.E2E_ENABLE_AI !== 'false',

    // AI model to use (default: claude-3-5-sonnet)
    aiModel: process.env.E2E_AI_MODEL || 'claude-3-5-sonnet-20241022',

    // Retry failed actions
    retries: parseInt(process.env.E2E_RETRIES || '2'),

    // Debug mode for AI decisions
    debugAI: process.env.E2E_DEBUG_AI === 'true',
  },

  // Test user credentials (for auth tests)
  testUsers: {
    operator: {
      email: process.env.E2E_OPERATOR_EMAIL || 'test.operator@kangopak.com',
      password: process.env.E2E_OPERATOR_PASSWORD || 'TestPassword123!',
      role: 'operator',
    },
    teamLeader: {
      email: process.env.E2E_TEAM_LEADER_EMAIL || 'test.teamleader@kangopak.com',
      password: process.env.E2E_TEAM_LEADER_PASSWORD || 'TestPassword123!',
      role: 'team-leader',
    },
    qaSupervisor: {
      email: process.env.E2E_QA_SUPERVISOR_EMAIL || 'test.qa@kangopak.com',
      password: process.env.E2E_QA_SUPERVISOR_PASSWORD || 'TestPassword123!',
      role: 'qa-supervisor',
    },
  },

  // Database configuration for test data cleanup
  database: {
    cleanupAfterTests: process.env.E2E_CLEANUP !== 'false',
    preserveTestData: process.env.E2E_PRESERVE_DATA === 'true',
  },

  // Playwright browser options
  browser: {
    name: (process.env.E2E_BROWSER || 'chromium') as 'chromium' | 'firefox' | 'webkit',
    viewport: {
      width: parseInt(process.env.E2E_VIEWPORT_WIDTH || '1920'),
      height: parseInt(process.env.E2E_VIEWPORT_HEIGHT || '1080'),
    },
  },
} as const;

/**
 * Selector strategy configuration
 * Priority order: data-testid → role selectors → AI fallback
 */
export const SELECTOR_STRATEGY = {
  // Prefer data-testid attributes
  preferTestId: true,

  // Fall back to AI detection if testid not found
  aiAfterTimeout: 3000, // milliseconds

  // Maximum time to wait for elements
  elementTimeout: 10000,
} as const;

/**
 * Test data configuration
 */
export const TEST_DATA = {
  // Sample NCA data for tests
  sampleNCA: {
    supplierName: 'Test Supplier Ltd',
    productDescription: 'Test product for automated E2E testing',
    ncDescription: 'This is a test non-conformance description for E2E testing purposes. It contains sufficient detail to pass validation requirements and quality gates.',
    rootCauseAnalysis: 'Test root cause analysis for E2E testing',
    correctiveAction: 'Test corrective action for E2E testing',
  },

  // Sample MJC data for tests
  sampleMJC: {
    description: 'Test maintenance job card for E2E testing purposes',
    workPerformed: 'Test work performed details',
    partsUsed: 'Test parts used',
  },
} as const;

export type E2EConfig = typeof E2E_CONFIG;
export type SelectorStrategy = typeof SELECTOR_STRATEGY;
export type TestData = typeof TEST_DATA;
