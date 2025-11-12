/**
 * Supplier Performance Service
 * Tracks supplier performance metrics from NCAs
 * PRD Enhancement: Supplier Performance Tracking
 * BRCGS: 3.4 Supplier Approval and Performance Monitoring
 */

import { createServerClient } from '@/lib/database/client';

export interface SupplierPerformanceMetrics {
  supplierId: string;
  supplierName: string;
  ncaCountYTD: number;
  ncaCountLast12Mo: number;
  averageClosureTime: number | null; // days
  qualityRating: number | null; // 1.0-5.0
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  lastNcaDate: string | null;
  trend: 'improving' | 'stable' | 'declining' | null;
}

/**
 * Update supplier performance metrics from NCA
 * Called when supplier-based NCA is created or closed
 */
export async function updateSupplierPerformanceFromNCA(
  ncaId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();

    // Fetch NCA
    const { data: nca, error: ncaError } = await (supabase
      .from('ncas') as any)
      .select('supplier_name, nc_origin, created_at, closed_at, status')
      .eq('id', ncaId)
      .single();

    if (ncaError || !nca) {
      return {
        success: false,
        error: `NCA not found: ${ncaError?.message || 'Unknown error'}`,
      };
    }

    // Only update for supplier-based NCAs
    const ncaData = nca as any;
    if (ncaData.nc_origin !== 'supplier-based' || !ncaData.supplier_name) {
      return { success: true }; // Not a supplier-based NCA, skip
    }

    // Find supplier by name
    const { data: supplier, error: supplierError } = await (supabase
      .from('suppliers') as any)
      .select('id, supplier_name')
      .ilike('supplier_name', `%${ncaData.supplier_name}%`)
      .limit(1)
      .single();

    if (supplierError || !supplier) {
      // Supplier not found - log but don't fail
      console.warn(`Supplier not found for NCA: ${ncaData.supplier_name}`);
      return { success: true }; // Continue without error
    }

    // Calculate metrics
    const now = new Date();
    const currentYear = now.getFullYear();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Count NCAs YTD
    const { count: ncaCountYTD } = await (supabase
      .from('ncas') as any)
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', ncaData.supplier_name)
      .eq('nc_origin', 'supplier-based')
      .gte('created_at', `${currentYear}-01-01`);

    // Count NCAs last 12 months
    const { count: ncaCountLast12Mo } = await (supabase
      .from('ncas') as any)
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', ncaData.supplier_name)
      .eq('nc_origin', 'supplier-based')
      .gte('created_at', twelveMonthsAgo.toISOString());

    // Calculate average closure time (for closed NCAs)
    const { data: closedNCAs } = await (supabase
      .from('ncas') as any)
      .select('created_at, closed_at')
      .eq('supplier_name', ncaData.supplier_name)
      .eq('nc_origin', 'supplier-based')
      .not('closed_at', 'is', null)
      .limit(100); // Limit for performance

    let averageClosureTime: number | null = null;
    if (closedNCAs && closedNCAs.length > 0) {
      const closureTimes = (closedNCAs as any[])
        .map((nca: any) => {
          if (!nca.closed_at || !nca.created_at) return null;
          const created = new Date(nca.created_at);
          const closed = new Date(nca.closed_at);
          return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)); // days
        })
        .filter((time): time is number => time !== null);

      if (closureTimes.length > 0) {
        averageClosureTime =
          closureTimes.reduce((sum, time) => sum + time, 0) / closureTimes.length;
      }
    }

    // Calculate quality rating (inverse of NCA frequency)
    // 5.0 = no NCAs, 1.0 = many NCAs
    let qualityRating: number | null = null;
    if (ncaCountLast12Mo !== null && ncaCountLast12Mo > 0) {
      // Scale: 0 NCAs = 5.0, 10+ NCAs = 1.0
      qualityRating = Math.max(1.0, Math.min(5.0, 5.0 - (ncaCountLast12Mo - 1) * 0.4));
    } else {
      qualityRating = 5.0; // No NCAs = perfect rating
    }

    // Determine risk level based on NCA count and closure time
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' | null = null;
    if (ncaCountLast12Mo !== null) {
      if (ncaCountLast12Mo >= 10 || (averageClosureTime && averageClosureTime > 30)) {
        riskLevel = 'critical';
      } else if (ncaCountLast12Mo >= 5 || (averageClosureTime && averageClosureTime > 20)) {
        riskLevel = 'high';
      } else if (ncaCountLast12Mo >= 2) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
    }

    // Update supplier
    const { error: updateError } = await (supabase
      .from('suppliers') as any)
      .update({
        nca_count_ytd: ncaCountYTD || 0,
        nca_count_last_12mo: ncaCountLast12Mo || 0,
        quality_rating: qualityRating,
        risk_level: riskLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', supplier.id);

    if (updateError) {
      return {
        success: false,
        error: `Failed to update supplier performance: ${updateError.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating supplier performance',
    };
  }
}

/**
 * Get supplier NCA count for date range
 */
export async function getSupplierNCACount(
  supplierId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    const supabase = createServerClient();

    // Get supplier name
    const { data: supplier, error: supplierError } = await (supabase
      .from('suppliers') as any)
      .select('supplier_name')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return 0;
    }

    let query = (supabase
      .from('ncas') as any)
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', supplier.supplier_name)
      .eq('nc_origin', 'supplier-based');

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting supplier NCAs:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getSupplierNCACount:', error);
    return 0;
  }
}

/**
 * Calculate supplier performance score
 * Returns a score from 0-100 based on multiple factors
 */
export async function calculateSupplierPerformanceScore(
  supplierId: string
): Promise<number> {
  try {
    const supabase = createServerClient();

    const { data: supplier, error } = await (supabase
      .from('suppliers') as any)
      .select('nca_count_last_12mo, quality_rating, on_time_delivery_pct, risk_level')
      .eq('id', supplierId)
      .single();

    if (error || !supplier) {
      return 0;
    }

    let score = 100;

    // Deduct points for NCAs
    const ncaCount = supplier.nca_count_last_12mo || 0;
    score -= Math.min(40, ncaCount * 4); // Max 40 points deduction

    // Deduct points for quality rating
    const qualityRating = supplier.quality_rating || 5.0;
    score -= (5.0 - qualityRating) * 10; // Max 40 points deduction

    // Deduct points for delivery performance
    const onTimeDelivery = supplier.on_time_delivery_pct || 100;
    score -= (100 - onTimeDelivery) * 0.2; // Max 20 points deduction

    // Deduct points for risk level
    const riskLevel = supplier.risk_level;
    if (riskLevel === 'critical') score -= 20;
    else if (riskLevel === 'high') score -= 10;
    else if (riskLevel === 'medium') score -= 5;

    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error('Error calculating supplier performance score:', error);
    return 0;
  }
}

/**
 * Get supplier trend analysis
 * Compares current period to previous period
 */
export async function getSupplierTrendAnalysis(
  supplierId: string
): Promise<{
  trend: 'improving' | 'stable' | 'declining';
  currentPeriod: number;
  previousPeriod: number;
  change: number;
}> {
  try {
    const supabase = createServerClient();

    // Get supplier name
    const { data: supplier, error: supplierError } = await (supabase
      .from('suppliers') as any)
      .select('supplier_name')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return {
        trend: 'stable',
        currentPeriod: 0,
        previousPeriod: 0,
        change: 0,
      };
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Current period (last 6 months)
    const { count: currentCount } = await supabase
      .from('ncas')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', supplier.supplier_name)
      .eq('nc_origin', 'supplier-based')
      .gte('created_at', sixMonthsAgo.toISOString());

    // Previous period (6-12 months ago)
    const { count: previousCount } = await supabase
      .from('ncas')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', supplier.supplier_name)
      .eq('nc_origin', 'supplier-based')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .lt('created_at', sixMonthsAgo.toISOString());

    const current = currentCount || 0;
    const previous = previousCount || 0;
    const change = current - previous;

    let trend: 'improving' | 'stable' | 'declining';
    if (change < -1) {
      trend = 'improving';
    } else if (change > 1) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      currentPeriod: current,
      previousPeriod: previous,
      change,
    };
  } catch (error) {
    console.error('Error in getSupplierTrendAnalysis:', error);
    return {
      trend: 'stable',
      currentPeriod: 0,
      previousPeriod: 0,
      change: 0,
    };
  }
}

/**
 * Get supplier performance metrics
 */
export async function getSupplierPerformanceMetrics(
  supplierId: string
): Promise<SupplierPerformanceMetrics | null> {
  try {
    const supabase = createServerClient();

    const { data: supplier, error } = await (supabase
      .from('suppliers') as any)
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error || !supplier) {
      return null;
    }

    const trend = await getSupplierTrendAnalysis(supplierId);

    return {
      supplierId: supplier.id,
      supplierName: supplier.supplier_name,
      ncaCountYTD: supplier.nca_count_ytd || 0,
      ncaCountLast12Mo: supplier.nca_count_last_12mo || 0,
      averageClosureTime: null, // TODO: Calculate from closed NCAs
      qualityRating: supplier.quality_rating || null,
      riskLevel: (supplier.risk_level as any) || null,
      lastNcaDate: null, // TODO: Get from most recent NCA
      trend: trend.trend,
    };
  } catch (error) {
    console.error('Error in getSupplierPerformanceMetrics:', error);
    return null;
  }
}

