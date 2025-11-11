/**
 * NCA Daily Reminder Service
 * Procedure 5.7: NCA book checked daily by Warehouse Team Leader
 * Sends daily reminder for new NCAs that need review
 */

import { createServerClient } from '@/lib/database/client';

export interface NewNCAReminder {
  nca_number: string;
  date: string;
  nc_type: string;
  supplier_name: string | null;
  nc_product_description: string;
  status: string;
  created_at: string;
}

/**
 * Get new NCAs created since last check
 * Returns NCAs created in the last 24 hours that haven't been reviewed
 */
export async function getNewNCAsForReminder(sinceDate?: Date): Promise<NewNCAReminder[]> {
  const supabase = createServerClient();
  
  // Default to 24 hours ago if not specified
  const since = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sinceISO = since.toISOString();

  const { data, error } = await supabase
    .from('ncas')
    .select('nca_number, date, nc_type, supplier_name, nc_product_description, status, created_at')
    .gte('created_at', sinceISO)
    .in('status', ['submitted', 'under-review'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching new NCAs for reminder:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((nca: { nca_number: string; date: string; nc_type: string; supplier_name: string | null; nc_product_description: string; status: string; created_at: string }) => ({
    nca_number: nca.nca_number,
    date: nca.date,
    nc_type: nca.nc_type,
    supplier_name: nca.supplier_name,
    nc_product_description: nca.nc_product_description,
    status: nca.status,
    created_at: nca.created_at,
  }));
}

/**
 * Get count of new NCAs for today
 */
export async function getTodayNewNCACount(): Promise<number> {
  const supabase = createServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { count, error } = await supabase
    .from('ncas')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

  if (error) {
    console.error('Error counting today\'s NCAs:', error);
    return 0;
  }

  return count || 0;
}

