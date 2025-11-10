/**
 * Jest Configuration for Integration Tests
 * Runs tests against live Supabase database with service role key
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Only run integration tests
  testMatch: ['**/tests/integration/**/*.test.ts'],

  // Path mapping for @ imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Setup file runs before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup-integration-tests.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'lib/**/*.ts',
    'tests/helpers/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],

  // Coverage thresholds (enforce quality)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Output settings
  verbose: true,
  coverageDirectory: 'coverage/integration',

  // Timeout for database operations (30 seconds)
  testTimeout: 30000,

  // TypeScript configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
};
