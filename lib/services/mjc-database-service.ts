/**
 * MJC Database Service
 * Centralized database query logic for Maintenance Job Cards
 * Architecture: Dependency injection pattern - client passed as constructor parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, MJC, MJCInsert, MJCUpdate, MJCStatus, MJCUrgency } from '@/types/database';
import {
  BaseDatabaseService,
  type ListOptions,
  type ListResponse,
  type SingleResponse,
} from './base-database-service';

/**
 * MJC-specific list options
 */
export interface MJCListOptions extends ListOptions {
  status?: MJCStatus;
  urgency?: MJCUrgency;
  machine_status?: 'down' | 'operational';
  maintenance_category?: 'reactive' | 'planned';
  temporary_repair?: boolean;
}

/**
 * MJC with related data for detail view
 */
export interface MJCWithDetails extends MJC {
  work_order?: {
    wo_number: string;
    product_description: string | null;
  } | null;
  raised_by?: {
    name: string;
    email: string;
  } | null;
  assigned_to_user?: {
    name: string;
    email: string;
  } | null;
}

/**
 * MJC Database Service
 * Provides centralized database operations for MJCs
 */
export class MJCDatabaseService extends BaseDatabaseService<MJC, MJCInsert, MJCUpdate> {
  /**
   * List view fields (optimized - only columns needed for list display)
   */
  private readonly LIST_VIEW_FIELDS = [
    'id',
    'job_card_number',
    'status',
    'created_at',
    'machine_equipment',
    'urgency',
    'raised_by_user_id',
    'hygiene_clearance_by',
    'machine_status',
    'maintenance_category',
    'temporary_repair',
    'close_out_due_date',
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
    ),
    assigned_users:assigned_to (
      name,
      email
    )
  `;

  constructor(client: SupabaseClient<Database>) {
    super(client, 'mjcs');
  }

  /**
   * List MJCs with filtering, sorting, and pagination
   */
  async listMJCs(options: MJCListOptions = {}): Promise<ListResponse<MJC>> {
    const {
      status,
      urgency,
      machine_status,
      maintenance_category,
      temporary_repair,
      page,
      pageSize = 10,
      search,
      sortBy,
      sortDir = 'desc',
    } = options;

    // Build query with optimized field selection
    let query = this.buildSelectQuery(this.LIST_VIEW_FIELDS);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    if (machine_status) {
      query = query.eq('machine_status', machine_status);
    }

    if (maintenance_category) {
      query = query.eq('maintenance_category', maintenance_category);
    }

    if (temporary_repair !== undefined) {
      query = query.eq('temporary_repair', temporary_repair);
    }

    // Apply search (across multiple fields)
    if (search) {
      query = query.or(
        `job_card_number.ilike.%${search}%,` +
        `machine_equipment.ilike.%${search}%,` +
        `description_required.ilike.%${search}%`
      );
    }

    // Apply sorting - default to urgency (critical first) then created_at
    if (sortBy) {
      query = this.applySorting(query, sortBy, sortDir);
    } else {
      query = query
        .order('urgency', { ascending: true })
        .order('created_at', { ascending: false });
    }

    // Apply pagination
    query = this.applyPagination(query, page, pageSize);

    // Execute query
    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get single MJC by ID
   */
  async getMJCById(id: string): Promise<SingleResponse<MJC>> {
    return this.getById(id);
  }

  /**
   * Get MJC with all related data (for detail view)
   */
  async getMJCWithDetails(id: string): Promise<SingleResponse<MJCWithDetails>> {
    const query = this.client
      .from(this.tableName)
      .select(this.DETAIL_VIEW_FIELDS)
      .eq('id', id);

    return this.executeSingleQuery<MJCWithDetails>(query);
  }

  /**
   * Create new MJC
   */
  async createMJC(data: MJCInsert): Promise<SingleResponse<{ id: string; job_card_number: string }>> {
    const { data: insertedData, error } = await (this.client
      .from(this.tableName) as any)
      .insert(data)
      .select('id, job_card_number')
      .single();

    if (error) {
      return {
        data: null,
        error: `Failed to create MJC: ${error.message}`,
      };
    }

    return {
      data: insertedData,
    };
  }

  /**
   * Update MJC
   */
  async updateMJC(
    id: string,
    data: MJCUpdate
  ): Promise<SingleResponse<{ id: string; job_card_number: string }>> {
    const { data: updatedData, error } = await (this.client
      .from(this.tableName) as any)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, job_card_number')
      .single();

    if (error) {
      return {
        data: null,
        error: `Failed to update MJC: ${error.message}`,
      };
    }

    return {
      data: updatedData,
    };
  }

  /**
   * Delete MJC (hard delete)
   */
  async deleteMJC(id: string): Promise<{ success: boolean; error?: string }> {
    return this.delete(id);
  }

  /**
   * Get MJCs by work order ID
   */
  async getByWorkOrder(woId: string): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('wo_id', woId)
      .order('created_at', { ascending: false });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get MJCs assigned to a user
   */
  async getByAssignedUser(userId: string): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('assigned_to', userId)
      .neq('status', 'closed')
      .order('urgency', { ascending: true })
      .order('created_at', { ascending: false });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get critical MJCs (urgency = critical and not closed)
   */
  async getCriticalMJCs(): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('urgency', 'critical')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get machine down MJCs
   */
  async getMachineDownMJCs(): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('machine_status', 'down')
      .neq('status', 'closed')
      .order('urgency', { ascending: true })
      .order('created_at', { ascending: false });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get temporary repair MJCs
   */
  async getTemporaryRepairMJCs(): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('temporary_repair', true)
      .neq('status', 'closed')
      .order('close_out_due_date', { ascending: true });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get overdue temporary repair MJCs (due date passed and not closed)
   */
  async getOverdueTemporaryRepairs(): Promise<ListResponse<MJC>> {
    const today = new Date().toISOString().split('T')[0];

    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('temporary_repair', true)
      .neq('status', 'closed')
      .lt('close_out_due_date', today)
      .order('close_out_due_date', { ascending: true });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get MJCs awaiting hygiene clearance
   */
  async getAwaitingHygieneClearance(): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select(this.LIST_VIEW_FIELDS, { count: 'exact' })
      .eq('status', 'awaiting-clearance')
      .order('created_at', { ascending: false });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Get MJCs linked to an NCA
   */
  async getLinkedToNCA(ncaId: string): Promise<ListResponse<MJC>> {
    const query = this.client
      .from(this.tableName)
      .select('id, job_card_number, status, description_required', { count: 'exact' })
      .eq('linked_nca_id', ncaId)
      .order('created_at', { ascending: false });

    return this.executeListQuery<MJC>(query);
  }

  /**
   * Count MJCs by status
   */
  async countByStatus(status: MJCStatus): Promise<number> {
    return this.count({ status });
  }

  /**
   * Count MJCs by urgency
   */
  async countByUrgency(urgency: MJCUrgency): Promise<number> {
    return this.count({ urgency });
  }

  /**
   * Count total MJCs
   */
  async countAll(): Promise<number> {
    return this.count();
  }
}
