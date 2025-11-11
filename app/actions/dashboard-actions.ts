'use server';

/**
 * Dashboard Actions
 * Server actions for fetching dashboard data (charts, KPIs, etc.)
 */

import { createServerClient } from '@/lib/database/client';

/**
 * NC Trend Data (12 weeks)
 * Returns NCA count per week for the last 12 weeks
 */
export async function getNCTrendData(): Promise<Array<{ week: string; count: number }>> {
  const supabase = createServerClient();

  // Calculate date range (12 weeks ago to today)
  const today = new Date();
  const twelveWeeksAgo = new Date(today);
  twelveWeeksAgo.setDate(today.getDate() - 84); // 12 weeks = 84 days

  // Fetch all NCAs created in the last 12 weeks
  const { data, error } = await supabase
    .from('ncas')
    .select('date, created_at')
    .gte('created_at', twelveWeeksAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  // Group by week
  const weekCounts: Record<string, number> = {};
  
  // Initialize all 12 weeks with 0
  for (let i = 11; i >= 0; i--) {
    const weekDate = new Date(today);
    weekDate.setDate(today.getDate() - (i * 7));
    const weekKey = getWeekKey(weekDate);
    weekCounts[weekKey] = 0;
  }

  // Count NCAs per week
  data.forEach((nca) => {
    const ncaDate = new Date(nca.created_at || nca.date);
    const weekKey = getWeekKey(ncaDate);
    if (weekCounts[weekKey] !== undefined) {
      weekCounts[weekKey]++;
    }
  });

  // Convert to array format for chart
  return Object.entries(weekCounts)
    .map(([week, count]) => ({
      week: formatWeekLabel(week),
      count,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Maintenance Response Data
 * Returns average response time (hours) by urgency level
 */
export async function getMaintenanceResponseData(): Promise<
  Array<{ urgency: string; avgHours: number }>
> {
  const supabase = createServerClient();

  // Fetch all closed MJCs with urgency and timestamps
  const { data, error } = await supabase
    .from('mjcs')
    .select('urgency, created_at, closed_at, status')
    .eq('status', 'closed')
    .not('created_at', 'is', null)
    .not('closed_at', 'is', null);

  if (error || !data) {
    return [];
  }

  // Group by urgency and calculate average response time
  const urgencyGroups: Record<string, number[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  data.forEach((mjc) => {
    if (!mjc.urgency || !mjc.created_at || !mjc.closed_at) return;

    const created = new Date(mjc.created_at);
    const closed = new Date(mjc.closed_at);
    const hours = (closed.getTime() - created.getTime()) / (1000 * 60 * 60);

    const urgency = mjc.urgency.toLowerCase();
    if (urgencyGroups[urgency]) {
      urgencyGroups[urgency].push(hours);
    }
  });

  // Calculate averages
  return Object.entries(urgencyGroups).map(([urgency, hours]) => {
    const avgHours = hours.length > 0 
      ? hours.reduce((sum, h) => sum + h, 0) / hours.length 
      : 0;
    
    return {
      urgency: urgency.charAt(0).toUpperCase() + urgency.slice(1),
      avgHours: Math.round(avgHours * 10) / 10, // Round to 1 decimal place
    };
  });
}

/**
 * Helper: Get week key (YYYY-WW format)
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Helper: Format week label for display
 */
function formatWeekLabel(weekKey: string): string {
  const [year, week] = weekKey.split('-W');
  return `Week ${week}`;
}

