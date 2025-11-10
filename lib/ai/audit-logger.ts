/**
 * Audit Logger Implementation
 * Logs all AI interactions for BRCGS compliance and audit trail
 */

import { IAuditLogger } from './ai-service.interface';
import { SupabaseClient } from '@supabase/supabase-js';

export class AuditLogger implements IAuditLogger {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Log AI interaction with full context for audit trail
   */
  async logInteraction(params: {
    user_id: string;
    user_role: string;
    query_type: string;
    query_context: unknown;
    response: unknown;
    quality_score?: number;
    confidence?: string;
    procedure_references?: ReadonlyArray<string>;
    escalation_triggered?: boolean;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from('ai_interaction_audit').insert({
        user_id: params.user_id,
        user_role: params.user_role,
        query_type: params.query_type,
        query_context: params.query_context,
        response: params.response,
        quality_score: params.quality_score ?? null,
        confidence: params.confidence ?? null,
        brcgs_procedures_referenced: params.procedure_references ?? [],
        escalation_triggered: params.escalation_triggered ?? false,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('Failed to log AI interaction:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - audit logging failures should not break AI functionality
    }
  }

  /**
   * Log user feedback on AI suggestion
   */
  async logFeedback(params: {
    record_id: string;
    record_type: 'nca' | 'mjc';
    ai_suggestion: string;
    user_edited_version?: string;
    accepted: boolean;
    rating?: number;
    feedback?: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.from('ai_suggestion_feedback').insert({
        record_id: params.record_id,
        record_type: params.record_type,
        ai_suggestion: params.ai_suggestion,
        user_edited_version: params.user_edited_version ?? null,
        suggestion_accepted: params.accepted,
        user_rating: params.rating ?? null,
        user_feedback: params.feedback ?? null,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Failed to log AI feedback:', error);
      }
    } catch (error) {
      console.error('Feedback logging error:', error);
    }
  }

  /**
   * Query audit logs for analysis
   * Useful for understanding AI usage patterns and quality
   */
  async getInteractionStats(user_id: string, days: number = 30): Promise<{
    total_interactions: number;
    average_quality_score: number;
    escalation_rate: number;
    query_types: Record<string, number>;
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await this.supabase
        .from('ai_interaction_audit')
        .select('query_type, quality_score, escalation_triggered')
        .eq('user_id', user_id)
        .gte('timestamp', since.toISOString());

      if (error || !data) {
        return {
          total_interactions: 0,
          average_quality_score: 0,
          escalation_rate: 0,
          query_types: {}
        };
      }

      const total = data.length;
      const qualityScores = data
        .map(row => row.quality_score)
        .filter((score): score is number => score !== null);
      const averageQuality = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : 0;
      const escalations = data.filter(row => row.escalation_triggered).length;

      const queryTypes: Record<string, number> = {};
      data.forEach(row => {
        queryTypes[row.query_type] = (queryTypes[row.query_type] ?? 0) + 1;
      });

      return {
        total_interactions: total,
        average_quality_score: Math.round(averageQuality),
        escalation_rate: total > 0 ? escalations / total : 0,
        query_types: queryTypes
      };
    } catch (error) {
      console.error('Error fetching interaction stats:', error);
      return {
        total_interactions: 0,
        average_quality_score: 0,
        escalation_rate: 0,
        query_types: {}
      };
    }
  }
}
