import { SupabaseClient } from '@supabase/supabase-js';
import type { WorkOrder, IWorkOrderService } from '../types/work-order';

/**
 * Work Order Service Implementation
 * BRCGS Compliance: Section 3.9 Traceability
 *
 * Architecture: Zero static calls - Supabase client injected via constructor
 * Enables full testability and mockability
 */
export class WorkOrderService implements IWorkOrderService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Get active work order for a user
   * @param userId - User ID to fetch work order for
   * @returns Active work order or null if none exists
   */
  async getActiveWorkOrder(userId: string): Promise<WorkOrder | null> {
    try {
      const { data, error } = await this.supabase
        .from('work_orders')
        .select('*')
        .eq('operator_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        // PGRST116 = no rows found (expected case - not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        // Log other errors with full details
        const errorDetails = {
          code: error.code || 'UNKNOWN',
          message: error.message || 'Unknown error',
          details: error.details || null,
          hint: error.hint || null,
        };
        console.error('Work order fetch error:', JSON.stringify(errorDetails, null, 2));
        return null;
      }

      return data as WorkOrder;
    } catch (err) {
      console.error('Unexpected error fetching work order:', err);
      return null;
    }
  }
}

/**
 * Factory function for creating WorkOrderService instances
 * @param supabaseClient - Supabase client to inject
 * @returns WorkOrderService instance
 */
export function createWorkOrderService(
  supabaseClient: SupabaseClient
): IWorkOrderService {
  return new WorkOrderService(supabaseClient);
}
