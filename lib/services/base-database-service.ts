/**
 * Base Database Service
 * Abstract class providing common query patterns for database operations
 * Architecture: Dependency injection pattern - client passed as constructor parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Common filter options for list queries
 */
export interface ListOptions {
  status?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * Standard list response structure
 */
export interface ListResponse<T> {
  data: T[];
  total: number;
  error?: string;
}

/**
 * Standard single record response structure
 */
export interface SingleResponse<T> {
  data: T | null;
  error?: string;
}

/**
 * Standard operation response structure
 */
export interface OperationResponse {
  success: boolean;
  error?: string;
}

/**
 * Abstract base class for database services
 * Provides common query building patterns
 *
 * @template TRow - Database row type
 * @template TInsert - Database insert type
 * @template TUpdate - Database update type
 */
export abstract class BaseDatabaseService<TRow, _TInsert, _TUpdate> {
  protected client: SupabaseClient<Database>;
  protected tableName: string;

  constructor(client: SupabaseClient<Database>, tableName: string) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Apply pagination to query
   * Converts page/pageSize to offset/limit
   */
  protected applyPagination(
    query: any,
    page?: number,
    pageSize: number = 10
  ): any {
    if (page !== undefined && page > 0) {
      const offset = (page - 1) * pageSize;
      return query.range(offset, offset + pageSize - 1);
    }
    return query.limit(pageSize);
  }

  /**
   * Apply sorting to query
   */
  protected applySorting(
    query: any,
    sortBy: string = 'created_at',
    sortDir: 'asc' | 'desc' = 'desc'
  ): any {
    return query.order(sortBy, { ascending: sortDir === 'asc' });
  }

  /**
   * Apply status filter to query
   */
  protected applyStatusFilter(
    query: any,
    status?: string
  ): any {
    if (status) {
      return query.eq('status', status);
    }
    return query;
  }

  /**
   * Build select query with common fields
   */
  protected buildSelectQuery(fields: string): any {
    return this.client.from(this.tableName).select(fields, { count: 'exact' });
  }

  /**
   * Execute single record query
   */
  protected async executeSingleQuery<T>(
    query: any
  ): Promise<SingleResponse<T>> {
    const { data, error } = await query.single();

    if (error) {
      return {
        data: null,
        error: `Database error: ${error.message}`,
      };
    }

    return {
      data: data as T,
    };
  }

  /**
   * Execute list query
   */
  protected async executeListQuery<T>(
    query: any
  ): Promise<ListResponse<T>> {
    const { data, error, count } = await query;

    if (error) {
      return {
        data: [],
        total: 0,
        error: `Database error: ${error.message}`,
      };
    }

    return {
      data: (data || []) as T[],
      total: count || 0,
    };
  }

  /**
   * Get record by ID
   */
  async getById(id: string): Promise<SingleResponse<TRow>> {
    const query = this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    return this.executeSingleQuery<TRow>(query);
  }

  /**
   * Delete record (soft delete if supported)
   */
  async delete(id: string): Promise<OperationResponse> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      return {
        success: false,
        error: `Failed to delete record: ${error.message}`,
      };
    }

    return {
      success: true,
    };
  }

  /**
   * Count records with optional filter
   */
  protected async count(filters?: Record<string, any>): Promise<number> {
    let query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      return 0;
    }

    return count || 0;
  }
}
