/**
 * NCA Overdue Tracking Service
 * Procedure 5.7: NCAs must be closed out within 20 working days
 * Tracks overdue NCAs and sends notifications
 */

import { createServerClient } from '@/lib/database/client';

export interface OverdueNCA {
  id: string;
  nca_number: string;
  date: string;
  close_out_due_date: string;
  days_overdue: number;
  nc_type: string;
  supplier_name: string | null;
  nc_product_description: string;
  status: string;
}

/**
 * Get all overdue NCAs
 * Returns NCAs where close_out_due_date has passed and status is not 'closed'
 */
export async function getOverdueNCAs(): Promise<OverdueNCA[]> {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ncas')
    .select('id, nca_number, date, close_out_due_date, nc_type, supplier_name, nc_product_description, status')
    .neq('status', 'closed')
    .lt('close_out_due_date', today)
    .order('close_out_due_date', { ascending: true });

  if (error) {
    console.error('Error fetching overdue NCAs:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Calculate days overdue for each NCA
  return data
    .map((nca: { id: string; nca_number: string; date: string; close_out_due_date: string; nc_type: string; supplier_name: string | null; nc_product_description: string; status: string }) => {
      if (!nca.close_out_due_date || !today) {
        return null;
      }
      const dueDate = new Date(nca.close_out_due_date);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: nca.id,
        nca_number: nca.nca_number,
        date: nca.date,
        close_out_due_date: nca.close_out_due_date,
        days_overdue: daysOverdue,
        nc_type: nca.nc_type,
        supplier_name: nca.supplier_name,
        nc_product_description: nca.nc_product_description,
        status: nca.status,
      };
    })
    .filter((nca): nca is OverdueNCA => nca !== null);
}

/**
 * Update overdue status for all NCAs
 * Calls the database function to update is_overdue flag
 */
export async function updateOverdueStatus(): Promise<number> {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('update_nca_overdue_status');

  if (error) {
    console.error('Error updating overdue status:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get NCAs approaching due date (within 3 working days)
 */
export async function getNCAsApproachingDueDate(): Promise<OverdueNCA[]> {
  const supabase = createServerClient();
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);
  const threeDaysFromNowStr = threeDaysFromNow.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ncas')
    .select('id, nca_number, date, close_out_due_date, nc_type, supplier_name, nc_product_description, status')
    .neq('status', 'closed')
    .gte('close_out_due_date', today.toISOString().split('T')[0])
    .lte('close_out_due_date', threeDaysFromNowStr)
    .order('close_out_due_date', { ascending: true });

  if (error) {
    console.error('Error fetching NCAs approaching due date:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Calculate days remaining for each NCA
  return data.map((nca: { id: string; nca_number: string; date: string; close_out_due_date: string; nc_type: string; supplier_name: string | null; nc_product_description: string; status: string }) => {
    const dueDate = new Date(nca.close_out_due_date);
    const todayDate = new Date();
    const daysRemaining = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: nca.id,
      nca_number: nca.nca_number,
      date: nca.date,
      close_out_due_date: nca.close_out_due_date,
      days_overdue: -daysRemaining, // Negative means days remaining
      nc_type: nca.nc_type,
      supplier_name: nca.supplier_name,
      nc_product_description: nca.nc_product_description,
      status: nca.status,
    };
  });
}

