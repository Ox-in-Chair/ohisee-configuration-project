/**
 * NCA Weekly Review Service
 * Procedure 5.7: Weekly NCA Register review by Commercial Manager
 * Generates weekly report with overdue and approaching due NCAs
 */

import { createServerClient } from '@/lib/database/client';
import { getOverdueNCAs, getNCAsApproachingDueDate } from './nca-overdue-service';
import type { WeeklyNCAReviewPayload } from '@/lib/types/notification';

/**
 * Generate weekly NCA review report
 * Returns summary of all NCAs, overdue NCAs, and NCAs approaching due date
 */
export async function generateWeeklyNCAReview(): Promise<WeeklyNCAReviewPayload> {
  const supabase = createServerClient();

  // Get total NCA count (excluding closed)
  const { count: totalCount, error: totalError } = await supabase
    .from('ncas')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'closed');

  if (totalError) {
    console.error('Error counting total NCAs:', totalError);
  }

  // Get overdue NCAs
  const overdueNCAs = await getOverdueNCAs();

  // Get NCAs approaching due date (within 3 working days)
  const approachingNCAs = await getNCAsApproachingDueDate();

  // Format overdue NCAs for payload
  const overdueFormatted = overdueNCAs.map((nca) => ({
    nca_number: nca.nca_number,
    date: nca.date,
    close_out_due_date: nca.close_out_due_date,
    days_overdue: nca.days_overdue,
    nc_type: nca.nc_type,
    supplier_name: nca.supplier_name,
  }));

  // Format approaching due NCAs for payload
  const approachingFormatted = approachingNCAs.map((nca) => ({
    nca_number: nca.nca_number,
    date: nca.date,
    close_out_due_date: nca.close_out_due_date,
    days_remaining: -nca.days_overdue, // Convert negative days_overdue to positive days_remaining
    nc_type: nca.nc_type,
    supplier_name: nca.supplier_name,
  }));

  return {
    total_ncas: totalCount || 0,
    overdue_count: overdueNCAs.length,
    approaching_due_count: approachingNCAs.length,
    overdue_ncas: overdueFormatted,
    approaching_due_ncas: approachingFormatted,
  };
}

