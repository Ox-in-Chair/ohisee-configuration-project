/**
 * NCA Database Service
 * Centralized database query logic for NCAs
 * Architecture: Dependency injection pattern - client passed as constructor parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, NCA, NCAInsert, NCAUpdate, NCAStatus } from '@/types/database';
import {
  BaseDatabaseService,
  type ListOptions,
  type ListResponse,
  type SingleResponse,
} from './base-database-service';

/**
 * NCA-specific list options
 */
export interface NCAListOptions extends ListOptions {
  status?: NCAStatus;
  nc_type?: string;
  machine_status?: 'down' | 'operational';
  nc_origin?: 'supplier-based' | 'kangopak-based' | 'joint-investigation';
}

/**
 * NCA with related data for detail view
 */
export interface NCAWithDetails extends NCA {
  work_order?: {
    wo_number: string;
    product_description: string | null;
  } | null;
  raised_by?: {
    name: string;
    email: string;
  } | null;
}

/**
 * NCA Database Service
 * Provides centralized database operations for NCAs
 */
export class NCADatabaseService extends BaseDatabaseService<NCA, NCAInsert, NCAUpdate> {
  /**
   * List view fields (optimized - only columns needed for list display)
   */
  private readonly LIST_VIEW_FIELDS = [
    'id',
    'nca_number',
    'status',
    'created_at',
    'supplier_name',
    'nc_type',
    'nc_product_description',
    'nc_origin',
    'machine_status',
    'raised_by_user_id',
    'nc_description',
  ].join(', ');

  /**
   * Detail view fields (includes related data)
   */
  private readonly DETAIL_VIEW_FIELDS = `
    *,
    work_orders:wo_id (
      wo_number,
      product_description
    ),
    users:raised_by_user_id (
      name,
      email
    )
  `;

  constructor(client: SupabaseClient<Database>) {
    super(client, 'ncas');
  }

  /**
   * List NCAs with filtering, sorting, and pagination
   */
  async listNCAs(options: NCAListOptions = {}): Promise<ListResponse<NCA>> {
    const {
      status,
      nc_type,
      machine_status,
      nc_origin,
      page,
      pageSize = 10,
      search,
      sortBy = 'created_at',
      sortDir = 'desc',
    } = options;

    // Build query with optimized field selection
    let query = this.buildSelectQuery(this.LIST_VIEW_FIELDS);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (nc_type) {
      query = query.eq('nc_type', nc_type);
    }

    if (machine_status) {
      query = query.eq('machine_status', machine_status);
    }

    if (nc_origin) {
      query = query.eq('nc_origin', nc_origin);
    }

    // Apply search (across multiple fields)
    if (search) {
      query = query.or(
        `nca_number.ilike.%${search}%,` +
        `nc_product_description.ilike.%${search}%,` +
        `supplier_name.ilike.%${search}%,` +
        `nc_description.ilike.%${search}%`
      );
    }

    // Apply sorting
    query = this.applySorting(query, sortBy, sortDir);

    // Apply pagination
    query = this.applyPagination(query, page, pageSize);

    // Execute query
    return this.executeListQuery<NCA>(query);
  }

  /**
   * Get single NCA by ID
   */
  async getNCAById(id: string): Promise<SingleResponse<NCA>> {
    return this.getById(id);
  }

  /**
   * Get NCA with all related data (for detail view)
   */
  async getNCAWithDetails(id: string): Promise<SingleResponse<NCAWithDetails>> {
    const query = this.client
      .from(this.tableName)
      .select(this.DETAIL_VIEW_FIELDS)
      .eq('id', id);

    return this.executeSingleQuery<NCAWithDetails>(query);
  }

  /**
   * Create new NCA
   */
  async createNCA(data: NCAInsert): Promise<SingleResponse<{ id: string; nca_number: string }>> {
    const { data: insertedData, error } = await (this.client
      .from(this.tableName) as any)
      .insert(data)
      .select('id, nca_number')
      .single();

    if (error) {
      return {
        data: null,
        error: `Failed to create NCA: ${error.message}`,
      };
    }

    return {
      data: insertedData,
    };
  }

  /**
   * Update NCA
   */
  async updateNCA(
    id: string,
    data: NCAUpdate
  ): Promise<SingleResponse<{ id: string; nca_number: string }>> {
    const { data: updatedData, error } = await (this.client
      .from(this.tableName) as any)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, nca_number')
      .single();

    if (error) {
      return {
        data: null,
        error: `Failed to update NCA: ${error.message}`,
      };
    }

    return {
      data: updatedData,
    };
  }

  /**
   * Delete NCA (hard delete - no soft delete for NCAs)
   */
  async deleteNCA(id: string): Promise<{ success: boolean; error?: string }> {
    return this.delete(id);
  }

  /**
   * Get NCAs by work order ID
   */
  async getByWorkOrder(woId: string): Promise<ListResponse<NCA>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('wo_id', woId)
      .order('created_at', { ascending: false });

    return this.executeListQuery<NCA>(query);
  }

  /**
   * Get NCAs by supplier name
   */
  async getBySupplier(supplierName: string): Promise<ListResponse<NCA>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .ilike('supplier_name', `%${supplierName}%`)
      .order('created_at', { ascending: false });

    return this.executeListQuery<NCA>(query);
  }

  /**
   * Get overdue NCAs (open for more than 20 days)
   */
  async getOverdueNCAs(): Promise<ListResponse<NCA>> {
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .neq('status', 'closed')
      .lt('created_at', twentyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    return this.executeListQuery<NCA>(query);
  }

  /**
   * Get machine down NCAs
   */
  async getMachineDownNCAs(): Promise<ListResponse<NCA>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('machine_status', 'down')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    return this.executeListQuery<NCA>(query);
  }

  /**
   * Get NCAs requiring root cause analysis
   * (submitted or under-review status without root cause)
   */
  async getNCAsRequiringRootCause(): Promise<ListResponse<NCA>> {
    const query = this.client
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .in('status', ['submitted', 'under-review'])
      .is('root_cause_analysis', null)
      .order('created_at', { ascending: true });

    return this.executeListQuery<NCA>(query);
  }

  /**
   * Count NCAs by status
   */
  async countByStatus(status: NCAStatus): Promise<number> {
    return this.count({ status });
  }

  /**
   * Count total NCAs
   */
  async countAll(): Promise<number> {
    return this.count();
  }
}
