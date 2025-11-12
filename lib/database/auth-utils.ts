/**
 * Authentication Utilities
 * Helper functions for user authentication and authorization
 * Architecture: Used by Server Actions to retrieve authenticated user
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get authenticated user ID from Supabase session
 *
 * @param client - Supabase client instance
 * @returns User ID if authenticated, null otherwise
 *
 * Usage in Server Actions:
 * ```typescript
 * const supabase = createServerClient();
 * const userId = await getUserIdFromAuth(supabase);
 * if (!userId) {
 *   return { success: false, error: 'User must be authenticated' };
 * }
 * ```
 */
export async function getUserIdFromAuth(
  client: SupabaseClient
): Promise<string | null> {
  try {
    const { data: { user }, error } = await client.auth.getUser();

    if (error) {
      console.error('Error retrieving authenticated user:', error);
      return null;
    }

    return user?.id ?? null;
  } catch (error) {
    console.error('Unexpected error in getUserIdFromAuth:', error);
    return null;
  }
}

/**
 * Get authenticated user with profile data
 *
 * @param client - Supabase client instance
 * @returns User object with profile data, null if not authenticated
 *
 * Usage:
 * ```typescript
 * const user = await getAuthenticatedUser(supabase);
 * if (!user) {
 *   return { success: false, error: 'Unauthorized' };
 * }
 * console.log(user.role, user.name);
 * ```
 */
export async function getAuthenticatedUser(
  client: SupabaseClient
): Promise<{
  id: string;
  role: string;
  name: string;
  department: string | null;
} | null> {
  try {
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await client
      .from('users')
      .select('id, role, name, department')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('User profile not found:', profileError);
      return null;
    }

    return profile as {
      id: string;
      role: string;
      name: string;
      department: string | null;
    };
  } catch (error) {
    console.error('Unexpected error in getAuthenticatedUser:', error);
    return null;
  }
}

/**
 * Verify user has required role
 *
 * @param client - Supabase client instance
 * @param requiredRole - Role required for operation
 * @returns true if user has required role, false otherwise
 */
export async function userHasRole(
  client: SupabaseClient,
  requiredRole: string | string[]
): Promise<boolean> {
  const user = await getAuthenticatedUser(client);

  if (!user) {
    return false;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }

  return user.role === requiredRole;
}
