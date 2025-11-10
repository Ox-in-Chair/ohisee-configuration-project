const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

module.exports = {
  displayName: 'react-components',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/components', '<rootDir>/hooks'],
  testMatch: ['**/__tests__/**/*.tsx', '**/__tests__/**/*.ts', '**/?(*.)+(spec|test).tsx', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  coverageDirectory: 'coverage/react',
  verbose: true,
  testTimeout: 10000,
};
