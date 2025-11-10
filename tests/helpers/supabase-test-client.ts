/**
 * Supabase Test Client
 * Creates authenticated Supabase client with service role key for testing
 *
 * SECURITY: Service role key bypasses RLS - ONLY use in test environment
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../../types/database';

/**
 * Creates a Supabase client with service role privileges for testing
 * @throws {Error} If required environment variables are missing
 * @returns {SupabaseClient<Database>} Authenticated Supabase client
 */
export function createTestClient(): SupabaseClient<Database> {
  // Load environment variables from .env.local
  dotenv.config({ path: '.env.local' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not defined. Check .env.local file.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not defined. Check .env.local file.'
    );
  }

  // Create client with service role (bypasses RLS)
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
  });
}

/**
 * Verifies Supabase connection is working
 * @param client - Supabase client to test
 * @returns {Promise<boolean>} True if connection successful
 */
export async function verifyConnection(
  client: SupabaseClient<Database>
): Promise<boolean> {
  try {
    const { error } = await client.from('users').select('id').limit(1);
    return error === null;
  } catch {
    return false;
  }
}

/**
 * Creates a test client and verifies connection
 * @throws {Error} If connection fails
 * @returns {Promise<SupabaseClient<Database>>} Connected client
 */
export async function createAndVerifyTestClient(): Promise<SupabaseClient<Database>> {
  const client = createTestClient();
  const isConnected = await verifyConnection(client);

  if (!isConnected) {
    throw new Error(
      'Failed to connect to Supabase. Check credentials and network connection.'
    );
  }

  return client;
}
