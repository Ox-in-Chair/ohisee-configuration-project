/**
 * Agent 12: Authentication & Authorization Utilities
 * TDD Phase: GREEN - Auth helper for Server Components and Actions
 *
 * Purpose: Centralized authentication utilities to eliminate hardcoded user IDs
 * BRCGS Compliance: Section 3.3 (Audit Trail) requires real user identification
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

/**
 * Retrieves the authenticated user from Supabase auth
 * Throws error if user is not authenticated
 *
 * @param client - Supabase client instance (dependency injection)
 * @returns Authenticated user object
 * @throws Error if authentication fails or user not found
 *
 * @example
 * ```typescript
 * export async function createNCA(formData: NCAFormData) {
 *   const supabase = createServerClient();
 *   const user = await getAuthenticatedUser(supabase);
 *   const userId = user.id; // ✅ Real user ID, not hardcoded
 * }
 * ```
 */
export async function getAuthenticatedUser(client: SupabaseClient<Database>) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Checks if user is authenticated without throwing
 * Returns null if not authenticated
 *
 * @param client - Supabase client instance
 * @returns User object or null
 *
 * @example
 * ```typescript
 * const user = await tryGetUser(supabase);
 * if (!user) {
 *   return { success: false, error: 'Please log in' };
 * }
 * ```
 */
export async function tryGetUser(client: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
}

/**
 * Middleware-style auth check for Server Actions
 * Returns ActionResponse error if authentication fails
 *
 * @param client - Supabase client instance
 * @returns Object with user if authenticated, or error response
 *
 * @example
 * ```typescript
 * export async function createNCA(formData: NCAFormData): Promise<ActionResponse<NCA>> {
 *   const supabase = createServerClient();
 *   const authResult = await requireAuth(supabase);
 *   if ('error' in authResult) {
 *     return authResult; // Early return with error
 *   }
 *   const { user } = authResult;
 *   // ... proceed with authenticated user
 * }
 * ```
 */
export async function requireAuth(client: SupabaseClient<Database>) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return {
      success: false as const,
      error: 'Unauthorized',
    };
  }

  return { user };
}
