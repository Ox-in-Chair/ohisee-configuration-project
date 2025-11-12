'use server';

/**
 * Work Order Actions
 * Server actions for work order operations
 */

import { createServerClient } from '@/lib/database/client';
import { revalidatePath } from 'next/cache';
import type { WorkOrderUpdate } from '@/types/database';
import type { ActionResponse } from './types';

/**
 * Get work order by ID
 */
export async function getWorkOrderById(woId: string): Promise<ActionResponse> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', woId)
    .single();

  if (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch work order',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * Get linked NCAs for a work order
 */
export async function getLinkedNCAs(woId: string): Promise<ActionResponse> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('ncas')
    .select('id, nca_number, date, status, machine_status, nc_type')
    .eq('wo_id', woId)
    .order('date', { ascending: false });

  if (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch linked NCAs',
    };
  }

  return {
    success: true,
    data: data || [],
  };
}

/**
 * Get linked MJCs for a work order
 */
export async function getLinkedMJCs(woId: string): Promise<ActionResponse> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('mjcs')
    .select('id, job_card_number, date, status, urgency, machine_status')
    .eq('wo_id', woId)
    .order('date', { ascending: false });

  if (error) {
    return {
      success: false,
      error: error.message || 'Failed to fetch linked MJCs',
    };
  }

  return {
    success: true,
    data: data || [],
  };
}

/**
 * Close work order (with validation)
 * Prevents closure if open issues exist
 */
export async function closeWorkOrder(
  woId: string,
  userId: string,
  forceClose: boolean = false
): Promise<ActionResponse> {
  const supabase = createServerClient();

  // Check for open issues if not forcing close
  if (!forceClose) {
    const [ncasResult, mjcsResult] = await Promise.all([
      supabase
        .from('ncas')
        .select('id, status')
        .eq('wo_id', woId)
        .in('status', ['open', 'under-review']),
      supabase
        .from('mjcs')
        .select('id, status')
        .eq('wo_id', woId)
        .in('status', ['open', 'assigned', 'in-progress', 'awaiting-clearance']),
    ]);

    const openNCAs = ncasResult.data?.length || 0;
    const openMJCs = mjcsResult.data?.length || 0;

    if (openNCAs > 0 || openMJCs > 0) {
      return {
        success: false,
        error: `Cannot close work order: ${openNCAs} open NCA(s) and ${openMJCs} open MJC(s) exist. Please resolve all issues before closing.`,
      };
    }
  }

  // Close the work order
  const updateData: WorkOrderUpdate & { updated_at?: string } = {
    status: 'completed',
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('work_orders')
    // @ts-ignore - Supabase type generation issue with work_orders table
    .update(updateData)
    .eq('id', woId)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message || 'Failed to close work order',
    };
  }

  // Revalidate relevant paths
  revalidatePath('/dashboard/production');
  revalidatePath(`/work-orders/${woId}`);

  return {
    success: true,
    data,
  };
}

