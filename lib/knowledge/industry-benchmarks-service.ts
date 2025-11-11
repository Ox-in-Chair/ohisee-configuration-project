/**
 * Industry Benchmarks Service
 * Provides industry benchmark comparisons and trend analysis
 */

import { createServerClient } from '@/lib/database/client';
import type { SupabaseClient } from '@/lib/database/client';

export interface IndustryBenchmark {
  id: string;
  metric_name: string;
  metric_category: 'response_time' | 'defect_rate' | 'cost' | 'quality_score' | 'other';
  industry_sector?: string;
  benchmark_value: number;
  percentile_25?: number;
  percentile_50?: number; // median
  percentile_75?: number;
  percentile_90?: number;
  data_source?: string;
  sample_size?: number;
  period_start?: string;
  period_end?: string;
}

export interface BenchmarkComparison {
  metric: IndustryBenchmark;
  userValue: number;
  comparison: {
    vsMedian: number; // percentage difference from median
    vsPercentile75: number; // percentage difference from 75th percentile
    percentile: number; // user's percentile (estimated)
  };
  message: string;
  recommendation?: string;
}

export class IndustryBenchmarksService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createServerClient();
  }

  /**
   * Get benchmark by metric name and category
   */
  async getBenchmark(
    metricName: string,
    metricCategory: IndustryBenchmark['metric_category'],
    industrySector?: string
  ): Promise<IndustryBenchmark | null> {
    let query = (this.supabase
      .from('industry_benchmarks') as any)
      .select('*')
      .eq('metric_name', metricName)
      .eq('metric_category', metricCategory)
      .eq('active', true);

    if (industrySector) {
      query = query.eq('industry_sector', industrySector);
    }

    const { data, error } = await query.order('period_end', { ascending: false }).limit(1).single();

    if (error || !data) {
      return null;
    }

    return this.mapToBenchmark(data);
  }

  /**
   * Compare user value against industry benchmark
   */
  async compareToBenchmark(
    metricName: string,
    metricCategory: IndustryBenchmark['metric_category'],
    userValue: number,
    industrySector?: string
  ): Promise<BenchmarkComparison | null> {
    const benchmark = await this.getBenchmark(metricName, metricCategory, industrySector);
    
    if (!benchmark) {
      return null;
    }

    // Calculate comparisons
    const vsMedian = benchmark.percentile_50
      ? ((userValue - benchmark.percentile_50) / benchmark.percentile_50) * 100
      : 0;
    
    const vsPercentile75 = benchmark.percentile_75
      ? ((userValue - benchmark.percentile_75) / benchmark.percentile_75) * 100
      : 0;

    // Estimate percentile (simplified)
    let percentile = 50; // default to median
    if (benchmark.percentile_25 && userValue < benchmark.percentile_25) {
      percentile = 25;
    } else if (benchmark.percentile_75 && userValue > benchmark.percentile_75) {
      percentile = 75;
    } else if (benchmark.percentile_90 && userValue > benchmark.percentile_90) {
      percentile = 90;
    }

    // Generate message
    let message = '';
    let recommendation: string | undefined;

    if (metricCategory === 'response_time') {
      const median = benchmark.percentile_50 || benchmark.benchmark_value;
      if (userValue <= median) {
        message = `Your response time: ${userValue.toFixed(1)} days (Industry median: ${median.toFixed(1)} days) - Excellent performance`;
      } else if (benchmark.percentile_75 && userValue <= benchmark.percentile_75) {
        message = `Your response time: ${userValue.toFixed(1)} days (Industry median: ${median.toFixed(1)} days) - Good performance`;
        recommendation = 'Consider implementing faster response protocols to match top performers.';
      } else {
        message = `Your response time: ${userValue.toFixed(1)} days (Industry median: ${median.toFixed(1)} days) - Below industry average`;
        recommendation = 'Review response time processes. Top performers average ' + (benchmark.percentile_25?.toFixed(1) || 'N/A') + ' days.';
      }
    } else if (metricCategory === 'defect_rate') {
      const median = benchmark.percentile_50 || benchmark.benchmark_value;
      if (benchmark.percentile_25 && userValue <= benchmark.percentile_25) {
        message = `Your defect rate: ${userValue.toFixed(2)}% (Industry 25th percentile: ${benchmark.percentile_25.toFixed(2)}%) - Top performer`;
      } else if (userValue <= median) {
        message = `Your defect rate: ${userValue.toFixed(2)}% (Industry median: ${median.toFixed(2)}%) - Good performance`;
      } else {
        message = `Your defect rate: ${userValue.toFixed(2)}% (Industry median: ${median.toFixed(2)}%) - Above industry average`;
        recommendation = 'Review quality control processes. Top performers maintain defect rates below ' + (benchmark.percentile_25?.toFixed(2) || 'N/A') + '%.';
      }
    } else {
      message = `Your value: ${userValue.toFixed(2)} (Industry benchmark: ${benchmark.benchmark_value.toFixed(2)})`;
    }

    return {
      metric: benchmark,
      userValue,
      comparison: {
        vsMedian,
        vsPercentile75,
        percentile,
      },
      message,
      recommendation,
    };
  }

  /**
   * Get all active benchmarks for a category
   */
  async getBenchmarksByCategory(
    metricCategory: IndustryBenchmark['metric_category'],
    industrySector?: string
  ): Promise<IndustryBenchmark[]> {
    let query = (this.supabase
      .from('industry_benchmarks') as any)
      .select('*')
      .eq('metric_category', metricCategory)
      .eq('active', true);

    if (industrySector) {
      query = query.eq('industry_sector', industrySector);
    }

    const { data, error } = await query.order('period_end', { ascending: false });

    if (error) {
      console.error('Error getting benchmarks by category:', error);
      return [];
    }

    return (data || []).map((item: any) => this.mapToBenchmark(item));
  }

  /**
   * Map database record to IndustryBenchmark
   */
  private mapToBenchmark(data: any): IndustryBenchmark {
    return {
      id: data.id,
      metric_name: data.metric_name,
      metric_category: data.metric_category,
      industry_sector: data.industry_sector,
      benchmark_value: Number(data.benchmark_value),
      percentile_25: data.percentile_25 ? Number(data.percentile_25) : undefined,
      percentile_50: data.percentile_50 ? Number(data.percentile_50) : undefined,
      percentile_75: data.percentile_75 ? Number(data.percentile_75) : undefined,
      percentile_90: data.percentile_90 ? Number(data.percentile_90) : undefined,
      data_source: data.data_source,
      sample_size: data.sample_size,
      period_start: data.period_start,
      period_end: data.period_end,
    };
  }
}

/**
 * Factory function for dependency injection
 */
export function createIndustryBenchmarksService(supabase?: SupabaseClient): IndustryBenchmarksService {
  return new IndustryBenchmarksService(supabase);
}

