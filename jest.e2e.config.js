/**
 * Jest Configuration for E2E Tests
 *
 * Separate configuration for end-to-end tests using Stagehand.
 * These tests run against a live application instance.
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'e2e',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.js'],
  testTimeout: 60000, // 60 seconds default timeout for E2E tests
  maxWorkers: 1, // Run tests serially to avoid conflicts
  verbose: true,
  collectCoverageFrom: [
    'tests/e2e/**/*.{js,jsx,ts,tsx}',
    '!tests/e2e/**/*.test.{js,jsx,ts,tsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
