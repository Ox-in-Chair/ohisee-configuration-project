/**
 * Integration Tests Setup File
 * Configures Jest environment for database integration testing
 *
 * SECURITY WARNING: Uses service role key to bypass RLS
 * Only run in test environment with test data
 */

import { beforeAll, afterAll } from '@jest/globals';
import * as dotenv from 'dotenv';
import * as path from 'path';

beforeAll(() => {
  // Load environment variables from .env.local
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure .env.local file exists with SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // Set test timeout globally (database operations can be slow)
  jest.setTimeout(30000); // 30 seconds

  console.log('Integration tests initialized');
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
});

afterAll(async () => {
  // Global cleanup if needed
  console.log('Integration tests completed');
});
