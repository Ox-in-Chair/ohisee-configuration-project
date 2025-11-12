/**
 * Supplier Performance Dashboard
 * Displays supplier performance metrics and NCA trends
 * PRD Enhancement: Supplier Performance Tracking
 * BRCGS: 3.4 Supplier Approval and Performance Monitoring
 */

import { Metadata } from 'next';
import { createServerClient } from '@/lib/database/client';
import { SupplierPerformanceDashboard } from '@/components/dashboard/supplier-performance-dashboard';

export const metadata: Metadata = {
  title: 'Supplier Performance | OHiSee',
  description: 'Supplier performance metrics and NCA trends',
};

interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  approval_status: string;
  nca_count_ytd: number;
  nca_count_last_12mo: number;
  quality_rating: number | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null;
  on_time_delivery_pct: number | null;
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = createServerClient();

  const { data, error } = await (supabase
    .from('suppliers') as any)
    .select('id, supplier_code, supplier_name, approval_status, nca_count_ytd, nca_count_last_12mo, quality_rating, risk_level, on_time_delivery_pct')
    .order('supplier_name');

  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }

  return (data || []) as Supplier[];
}

export default async function SupplierPerformancePage() {
  const suppliers = await fetchSuppliers();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Performance Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor supplier performance metrics and NCA trends (BRCGS 3.4)
        </p>
      </div>

      <SupplierPerformanceDashboard suppliers={suppliers} />
    </div>
  );
}

