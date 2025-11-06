/**
 * OHiSee NCA/MJC System - Database Client Utilities
 * ARCHITECTURE: All database access via dependency injection
 * NO STATIC CALLS - Always pass Supabase client as parameter
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// =============================================================================
// Client Factory Functions (Dependency Injection)
// =============================================================================

/**
 * Create server-side Supabase client for Server Components and Server Actions
 * Uses service role key - BYPASSES RLS
 * ONLY use for trusted server-side operations
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create client-side Supabase client for Client Components
 * Uses anon key - ENFORCES RLS
 * All queries filtered by auth.uid()
 */
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// =============================================================================
// Type Exports for Dependency Injection
// =============================================================================

export type SupabaseClient = ReturnType<typeof createServerClient>;
export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

// =============================================================================
// Example Usage Patterns
// =============================================================================

/*
 * SERVER COMPONENT EXAMPLE:
 *
 * import { createServerClient } from '@/lib/database/client';
 *
 * export default async function NCARegisterPage() {
 *   const supabase = createServerClient();
 *   const { data: ncas } = await supabase.from('ncas').select('*');
 *   return <NCATable ncas={ncas} />;
 * }
 */

/*
 * SERVER ACTION EXAMPLE:
 *
 * 'use server';
 * import { createServerClient } from '@/lib/database/client';
 *
 * export async function createNCA(formData: NCAFormData) {
 *   const supabase = createServerClient();
 *   const { data, error } = await supabase.from('ncas').insert(formData);
 *   if (error) throw error;
 *   return data;
 * }
 */

/*
 * CLIENT COMPONENT EXAMPLE:
 *
 * 'use client';
 * import { createBrowserClient } from '@/lib/database/client';
 * import { useEffect, useState } from 'react';
 *
 * export function NCACounter() {
 *   const [count, setCount] = useState(0);
 *   const supabase = createBrowserClient();
 *
 *   useEffect(() => {
 *     async function fetchCount() {
 *       const { count } = await supabase.from('ncas').select('*', { count: 'exact', head: true });
 *       setCount(count || 0);
 *     }
 *     fetchCount();
 *   }, []);
 *
 *   return <div>NCAs: {count}</div>;
 * }
 */

/*
 * UTILITY FUNCTION EXAMPLE (with injected client):
 *
 * import type { SupabaseClient } from '@/lib/database/client';
 *
 * export async function getNCAById(client: SupabaseClient, id: string) {
 *   const { data, error } = await client.from('ncas').select('*').eq('id', id).single();
 *   if (error) throw error;
 *   return data;
 * }
 *
 * // Usage in Server Component:
 * const supabase = createServerClient();
 * const nca = await getNCAById(supabase, '123');
 */
