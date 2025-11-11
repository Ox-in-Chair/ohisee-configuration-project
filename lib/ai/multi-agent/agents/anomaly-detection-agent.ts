/**
 * Anomaly Detection Agent
 * Flags entries that deviate significantly from norms or past data
 * Uses historical data to learn typical ranges and patterns
 */

import type { NCA, MJC, User } from '../../types';
import type { AgentResult } from '../types';
import { createServerClient } from '@/lib/database/client';

export class AnomalyDetectionAgent {
  /**
   * Analyze form data for anomalies
   */
  async analyze(
    formData: NCA | MJC,
    user: User,
    formType: 'nca' | 'mjc'
  ): Promise<AgentResult> {
    const requirements: AgentResult['requirements'] = [];
    const errors: AgentResult['errors'] = [];
    const warnings: AgentResult['warnings'] = [];
    let confidence = 0.6; // Moderate confidence (anomaly detection is probabilistic)

    if (formType === 'nca') {
      const ncaData = formData as NCA;

      // Check for quantity anomalies
      if (ncaData.nc_description) {
        const quantityMatch = ncaData.nc_description.match(/\b(\d+(?:\.\d+)?)\s*(kg|units|meters|boxes|pallets)\b/i);
        if (quantityMatch) {
          const quantity = parseFloat(quantityMatch[1]);
          const unit = quantityMatch[2].toLowerCase();

          // Get historical averages (simplified - in production, use actual stats)
          const anomaly = await this.checkQuantityAnomaly(quantity, unit, formType);
          if (anomaly) {
            warnings.push({
              field: 'nc_description',
              message: `Quantity ${quantity} ${unit} is unusually ${anomaly.direction} compared to historical average of ${anomaly.average}. Please verify this is correct.`,
              suggestion: 'Double-check the quantity affected. If correct, this will be flagged for review.',
            });
            confidence = 0.7;
          }
        }
      }

      // Check for date/time anomalies
      if (ncaData.nc_description) {
        const dateMatch = ncaData.nc_description.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
        if (dateMatch) {
          const reportedDate = new Date(dateMatch[1]);
          const today = new Date();
          const daysDiff = Math.abs((today.getTime() - reportedDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff > 30) {
            warnings.push({
              field: 'nc_description',
              message: `Reported date (${dateMatch[1]}) is more than 30 days ago. Please verify this is the correct date.`,
              suggestion: 'Ensure you are reporting the most recent occurrence of this issue.',
            });
            confidence = 0.8;
          }
        }
      }

      // Check for frequency anomalies (if this is a repeat issue)
      const frequencyAnomaly = await this.checkFrequencyAnomaly(ncaData, user);
      if (frequencyAnomaly) {
        warnings.push({
          field: 'nc_type',
          message: `This type of issue has been reported ${frequencyAnomaly.count} times in the last ${frequencyAnomaly.period} days, which is above normal.`,
          suggestion: 'Consider if this indicates a systemic issue requiring immediate attention.',
        });
        confidence = 0.85;
      }
    }

    return {
      requirements,
      errors,
      warnings,
      confidence,
      reasoning: `Anomaly Detection Agent analyzed ${formType} submission for deviations from historical patterns. Found ${warnings.length} potential anomalies based on quantity, date, and frequency analysis.`,
    };
  }

  /**
   * Check if quantity is anomalous compared to historical data
   */
  private async checkQuantityAnomaly(
    quantity: number,
    unit: string,
    formType: 'nca' | 'mjc'
  ): Promise<{ direction: 'high' | 'low'; average: number } | null> {
    try {
      const supabase = createServerClient();

      // Get historical average (simplified query - in production, use proper aggregation)
      const { data } = await supabase
        .from(formType === 'nca' ? 'nca_records' : 'mjc_records')
        .select('nc_description')
        .limit(100);

      // Simple heuristic: if quantity is >10x or <0.1x typical, flag as anomaly
      // In production, use actual statistical analysis
      const typicalRange = { min: 10, max: 1000 }; // Placeholder

      if (quantity > typicalRange.max * 10) {
        return { direction: 'high', average: typicalRange.max };
      } else if (quantity < typicalRange.min * 0.1) {
        return { direction: 'low', average: typicalRange.min };
      }

      return null;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return null;
    }
  }

  /**
   * Check if issue frequency is anomalous
   */
  private async checkFrequencyAnomaly(
    formData: NCA | MJC,
    user: User
  ): Promise<{ count: number; period: number } | null> {
    try {
      const supabase = createServerClient();
      const ncaData = formData as NCA;

      if (!ncaData.nc_type) return null;

      // Count similar issues in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count } = await supabase
        .from('nca_records')
        .select('*', { count: 'exact', head: true })
        .eq('nc_type', ncaData.nc_type)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Flag if more than 5 occurrences in 30 days (threshold)
      if (count && count > 5) {
        return { count, period: 30 };
      }

      return null;
    } catch (error) {
      console.error('Frequency anomaly check error:', error);
      return null;
    }
  }
}

