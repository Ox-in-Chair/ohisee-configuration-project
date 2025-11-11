'use server';

/**
 * NCA Trend Analysis Actions
 * Procedure 5.7.F2: NCA Trend Analysis for pattern identification
 * Provides comprehensive trend analysis data for management review
 */

import { createServerClient } from '@/lib/database/client';

export interface MonthlyTrendData {
  month: string;
  opened: number;
  closed: number;
  stillOpen: number;
}

export interface AgeAnalysisData {
  month: string;
  lessThan10Days: number;
  lessThan20Days: number;
  lessThan30Days: number;
  moreThan30Days: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

export interface SourceBreakdown {
  source: 'kangopak' | 'supplier' | 'customer';
  count: number;
  percentage: number;
}

export interface NCATrendAnalysis {
  monthlyTrends: MonthlyTrendData[];
  ageAnalysis: AgeAnalysisData[];
  categoryBreakdown: CategoryBreakdown[];
  sourceBreakdown: SourceBreakdown[];
  totalOpened: number;
  totalClosed: number;
  totalStillOpen: number;
  yearToDate: {
    opened: number;
    closed: number;
    stillOpen: number;
  };
}

/**
 * Get comprehensive NCA trend analysis
 * Returns data for Procedure 5.7.F2 trend analysis
 */
export async function getNCATrendAnalysis(year?: number): Promise<NCATrendAnalysis> {
  const supabase = createServerClient();
  const targetYear = year || new Date().getFullYear();

  // Calculate date range for the year
  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

  // Fetch all NCAs for the year
  const { data: ncas, error } = await supabase
    .from('ncas')
    .select('id, nca_number, date, created_at, close_out_date, close_out_due_date, status, nc_type, supplier_name, nc_description')
    .gte('created_at', yearStart.toISOString())
    .lte('created_at', yearEnd.toISOString())
    .order('created_at', { ascending: true });

  if (error || !ncas) {
    return {
      monthlyTrends: [],
      ageAnalysis: [],
      categoryBreakdown: [],
      sourceBreakdown: [],
      totalOpened: 0,
      totalClosed: 0,
      totalStillOpen: 0,
      yearToDate: {
        opened: 0,
        closed: 0,
        stillOpen: 0,
      },
    };
  }

  // Initialize monthly data
  const monthlyData: Record<string, { opened: number; closed: number; stillOpen: number }> = {};
  const ageData: Record<string, { lessThan10: number; lessThan20: number; lessThan30: number; moreThan30: number }> = {};
  const categoryCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = { kangopak: 0, supplier: 0, customer: 0 };

  // Initialize all months
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  monthNames.forEach((month) => {
    monthlyData[month] = { opened: 0, closed: 0, stillOpen: 0 };
    ageData[month] = { lessThan10: 0, lessThan20: 0, lessThan30: 0, moreThan30: 0 };
  });

  // Define NCA type
  type NCAType = { created_at: string; status?: string; close_out_date?: string; close_out_due_date?: string; nc_type?: string; supplier_name?: string; nc_description?: string };
  
  // Process each NCA
  const typedNCAs = (ncas || []) as NCAType[];
  typedNCAs.forEach((nca: NCAType) => {
    const createdDate = new Date(nca.created_at);
    const monthName = monthNames[createdDate.getMonth()];

    // Monthly trends
    monthlyData[monthName].opened++;

    if (nca.status === 'closed' && nca.close_out_date) {
      const closedDate = new Date(nca.close_out_date);
      const closedMonthName = monthNames[closedDate.getMonth()];
      if (monthlyData[closedMonthName]) {
        monthlyData[closedMonthName].closed++;
      }
    } else {
      monthlyData[monthName].stillOpen++;
    }

    // Age analysis (based on close-out date or current date for open NCAs)
    const today = new Date();
    const dueDate = (nca as any).close_out_due_date ? new Date((nca as any).close_out_due_date) : null;
    const referenceDate = nca.status === 'closed' && nca.close_out_date 
      ? new Date(nca.close_out_date)
      : dueDate || today;

    const daysDiff = Math.floor((referenceDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 10) {
      ageData[monthName].lessThan10++;
    } else if (daysDiff < 20) {
      ageData[monthName].lessThan20++;
    } else if (daysDiff < 30) {
      ageData[monthName].lessThan30++;
    } else {
      ageData[monthName].moreThan30++;
    }

    // Source breakdown (based on nc_type)
    if (nca.nc_type === 'raw-material' && nca.supplier_name) {
      sourceCounts.supplier++;
    } else if (nca.nc_type === 'finished-goods' || nca.nc_type === 'wip') {
      sourceCounts.kangopak++;
    } else {
      sourceCounts.customer++;
    }

    // Category breakdown (simplified - based on nc_description keywords)
    // This is a simplified version - in production, you'd want more sophisticated categorization
    const description = (nca.nc_description || '').toLowerCase();
    if (description.includes('seal') || description.includes('gusset') || description.includes('zipper')) {
      categoryCounts['Seal Integrity'] = (categoryCounts['Seal Integrity'] || 0) + 1;
    } else if (description.includes('equipment') || description.includes('machine') || description.includes('tool')) {
      categoryCounts['Equipment & Tools'] = (categoryCounts['Equipment & Tools'] || 0) + 1;
    } else if (description.includes('contamination') || description.includes('foreign')) {
      categoryCounts['Contamination'] = (categoryCounts['Contamination'] || 0) + 1;
    } else if (description.includes('print') || description.includes('registration') || description.includes('panel')) {
      categoryCounts['Print & Registration'] = (categoryCounts['Print & Registration'] || 0) + 1;
    } else if (description.includes('material') || description.includes('supplier')) {
      categoryCounts['Material Quality'] = (categoryCounts['Material Quality'] || 0) + 1;
    } else if (description.includes('packing') || description.includes('quantity')) {
      categoryCounts['Packing & Quantity'] = (categoryCounts['Packing & Quantity'] || 0) + 1;
    } else {
      categoryCounts['Other'] = (categoryCounts['Other'] || 0) + 1;
    }
  });

  // Calculate totals
  const totalOpened = typedNCAs.length;
  const totalClosed = typedNCAs.filter((n) => n.status === 'closed').length;
  const totalStillOpen = totalOpened - totalClosed;

  // Convert to arrays
  const monthlyTrends: MonthlyTrendData[] = monthNames.map((month) => ({
    month,
    opened: monthlyData[month].opened,
    closed: monthlyData[month].closed,
    stillOpen: monthlyData[month].stillOpen,
  }));

  const ageAnalysis: AgeAnalysisData[] = monthNames.map((month) => ({
    month,
    lessThan10Days: ageData[month].lessThan10,
    lessThan20Days: ageData[month].lessThan20,
    lessThan30Days: ageData[month].lessThan30,
    moreThan30Days: ageData[month].moreThan30,
  }));

  // Category breakdown with percentages
  const totalCategoryCount = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  const categoryBreakdown: CategoryBreakdown[] = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalCategoryCount > 0 ? Math.round((count / totalCategoryCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Source breakdown with percentages
  const totalSourceCount = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);
  const sourceBreakdown: SourceBreakdown[] = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source: source as 'kangopak' | 'supplier' | 'customer',
      count,
      percentage: totalSourceCount > 0 ? Math.round((count / totalSourceCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    monthlyTrends,
    ageAnalysis,
    categoryBreakdown,
    sourceBreakdown,
    totalOpened,
    totalClosed,
    totalStillOpen,
    yearToDate: {
      opened: totalOpened,
      closed: totalClosed,
      stillOpen: totalStillOpen,
    },
  };
}

