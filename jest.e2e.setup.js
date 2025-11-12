/**
 * Jest E2E Test Setup
 *
 * Initializes environment for E2E tests with Stagehand.
 */

// Set default test timeout
jest.setTimeout(60000);

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Ensure required environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    `Warning: Missing environment variables for E2E tests: ${missingEnvVars.join(', ')}`
  );
  console.warn(
    '\x1b[33m%s\x1b[0m',
    'Some E2E tests may fail. Please ensure .env.local is properly configured.'
  );
}

// Create test results directories
const fs = require('fs');
const path = require('path');

const dirs = ['./test-results', './test-results/screenshots', './test-results/videos'];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('\x1b[36m%s\x1b[0m', '='.repeat(60));
console.log('\x1b[36m%s\x1b[0m', 'Starting E2E Tests with Stagehand');
console.log('\x1b[36m%s\x1b[0m', '='.repeat(60));
console.log('Base URL:', process.env.E2E_BASE_URL || 'http://localhost:3008');
console.log('Headless:', process.env.E2E_HEADED !== 'true');
console.log('AI Enabled:', process.env.E2E_ENABLE_AI !== 'false');
console.log('\x1b[36m%s\x1b[0m', '='.repeat(60));
