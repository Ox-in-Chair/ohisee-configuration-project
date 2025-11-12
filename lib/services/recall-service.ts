/**
 * Recall Service
 * Flags NCAs matching recall criteria
 * PRD Enhancement: Product Recall Flagging
 * BRCGS: 3.11 Product Recall
 */

import { createServerClient } from '@/lib/database/client';

export interface RecallCriteria {
  product_code?: string;
  batch_numbers?: string[];
  carton_numbers?: string[];
  supplier_reel_box?: string[];
  job_numbers?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
}

/**
 * Flag NCAs matching recall criteria
 * Matches by product_code, batch_number, carton_numbers, supplier_reel_box
 */
export async function flagNCAsForRecall(
  recallId: string,
  criteria: RecallCriteria
): Promise<{ success: boolean; flaggedCount: number; error?: string }> {
  try {
    const supabase = createServerClient();

    // Build query to find matching NCAs
    let query = (supabase.from('ncas') as any).select('id, nca_number');

    // Match by product code (if available in nc_product_description)
    if (criteria.product_code) {
      query = query.ilike('nc_product_description', `%${criteria.product_code}%`);
    }

    // Match by batch numbers
    if (criteria.batch_numbers && criteria.batch_numbers.length > 0) {
      const batchConditions = criteria.batch_numbers
        .map((batch) => `supplier_wo_batch.ilike.%${batch}%`)
        .join(',');
      query = query.or(batchConditions);
    }

    // Match by carton numbers
    if (criteria.carton_numbers && criteria.carton_numbers.length > 0) {
      const cartonConditions = criteria.carton_numbers
        .map((carton) => `carton_numbers.ilike.%${carton}%`)
        .join(',');
      query = query.or(cartonConditions);
    }

    // Match by supplier reel/box
    if (criteria.supplier_reel_box && criteria.supplier_reel_box.length > 0) {
      const reelConditions = criteria.supplier_reel_box
        .map((reel) => `supplier_reel_box.ilike.%${reel}%`)
        .join(',');
      query = query.or(reelConditions);
    }

    // Match by work order/job numbers (via wo_id)
    if (criteria.job_numbers && criteria.job_numbers.length > 0) {
      // First, get work order IDs matching job numbers
      const { data: workOrders } = await (supabase
        .from('work_orders') as any)
        .select('id')
        .in('wo_number', criteria.job_numbers);

      if (workOrders && workOrders.length > 0) {
        const woIds = (workOrders as any[]).map((wo: any) => wo.id);
        query = query.in('wo_id', woIds);
      }
    }

    // Match by date range
    if (criteria.date_range) {
      query = query
        .gte('created_at', criteria.date_range.start.toISOString())
        .lte('created_at', criteria.date_range.end.toISOString());
    }

    const { data: matchingNCAs, error } = await query;

    if (error) {
      return {
        success: false,
        flaggedCount: 0,
        error: `Failed to find matching NCAs: ${error.message}`,
      };
    }

    if (!matchingNCAs || matchingNCAs.length === 0) {
      return {
        success: true,
        flaggedCount: 0,
      };
    }

    // Flag matching NCAs
    const ncaIds = (matchingNCAs as any[]).map((nca: any) => nca.id);
    const { error: updateError } = await (supabase
      .from('ncas') as any)
      .update({
        recall_id: recallId,
        recall_flagged: true,
      })
      .in('id', ncaIds);

    if (updateError) {
      return {
        success: false,
        flaggedCount: 0,
        error: `Failed to flag NCAs: ${updateError.message}`,
      };
    }

    // Update recall with affected NCA IDs
    const { error: recallUpdateError } = await (supabase
      .from('recalls') as any)
      .update({ affected_nca_ids: ncaIds })
      .eq('id', recallId);

    if (recallUpdateError) {
      console.error('Failed to update recall with NCA IDs:', recallUpdateError);
      // Don't fail - NCAs are flagged, just the recall update failed
    }

    return {
      success: true,
      flaggedCount: ncaIds.length,
    };
  } catch (error) {
    return {
      success: false,
      flaggedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error flagging NCAs',
    };
  }
}

/**
 * Get all NCAs flagged for a recall
 */
export async function getFlaggedNCAs(recallId: string): Promise<{
  success: boolean;
  ncas: Array<{ id: string; nca_number: string; nc_product_description: string }>;
  error?: string;
}> {
  try {
    const supabase = createServerClient();

    const { data: ncas, error } = await supabase
      .from('ncas')
      .select('id, nca_number, nc_product_description')
      .eq('recall_id', recallId)
      .eq('recall_flagged', true);

    if (error) {
      return {
        success: false,
        ncas: [],
        error: `Failed to fetch flagged NCAs: ${error.message}`,
      };
    }

    return {
      success: true,
      ncas: (ncas || []) as Array<{
        id: string;
        nca_number: string;
        nc_product_description: string;
      }>,
    };
  } catch (error) {
    return {
      success: false,
      ncas: [],
      error: error instanceof Error ? error.message : 'Unknown error fetching flagged NCAs',
    };
  }
}

/**
 * Unflag NCAs for a recall
 */
export async function unflagNCAsForRecall(recallId: string): Promise<{
  success: boolean;
  unflaggedCount: number;
  error?: string;
}> {
  try {
    const supabase = createServerClient();

    // Get affected NCA IDs from recall
    const { data: recall, error: recallError } = await (supabase
      .from('recalls') as any)
      .select('affected_nca_ids')
      .eq('id', recallId)
      .single();

    if (recallError || !recall) {
      return {
        success: false,
        unflaggedCount: 0,
        error: `Recall not found: ${recallError?.message || 'Unknown error'}`,
      };
    }

    const recallData = recall;
    const ncaIds = recallData.affected_nca_ids || [];

    if (ncaIds.length === 0) {
      return {
        success: true,
        unflaggedCount: 0,
      };
    }

    // Unflag NCAs
    const { error: updateError } = await (supabase
      .from('ncas') as any)
      .update({
        recall_id: null,
        recall_flagged: false,
      })
      .in('id', ncaIds);

    if (updateError) {
      return {
        success: false,
        unflaggedCount: 0,
        error: `Failed to unflag NCAs: ${updateError.message}`,
      };
    }

    // Clear affected NCA IDs from recall
    await (supabase.from('recalls') as any).update({ affected_nca_ids: [] }).eq('id', recallId);

    return {
      success: true,
      unflaggedCount: ncaIds.length,
    };
  } catch (error) {
    return {
      success: false,
      unflaggedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error unflagging NCAs',
    };
  }
}

