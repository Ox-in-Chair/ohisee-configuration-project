/**
 * Adaptive Policy Versioning Service (2026-2027)
 * Refines rules based on real-world usage and emerging standards
 * 
 * Features:
 * - Behavior analytics for policy refinement
 * - Versioned rule sets
 * - Machine-learned rule suggestions
 * - External standard update integration
 */

import { createServerClient } from '@/lib/database/client';

export interface PolicyVersion {
  version: string;
  effectiveDate: Date;
  rules: PolicyRule[];
  changelog: string[];
}

export interface PolicyRule {
  id: string;
  field: string;
  ruleType: 'minLength' | 'pattern' | 'completeness' | 'specificity';
  parameters: Record<string, any>;
  brcgsReference?: string;
  enabled: boolean;
}

export interface PolicyAnalytics {
  ruleId: string;
  totalChecks: number;
  passCount: number;
  failCount: number;
  overrideCount: number;
  averageAttempts: number;
  commonFailures: Array<{ element: string; count: number }>;
}

export interface RuleSuggestion {
  ruleId?: string; // If updating existing rule
  field: string;
  ruleType: PolicyRule['ruleType'];
  parameters: Record<string, any>;
  reason: string;
  confidence: number;
  suggestedBy: 'analytics' | 'external_standard' | 'admin';
}

export class AdaptivePolicyService {
  private readonly supabase = createServerClient();

  /**
   * Get current active policy version
   */
  async getCurrentPolicy(): Promise<PolicyVersion> {
    try {
      const { data } = await (this.supabase
        .from('policy_versions') as any)
        .select('*')
        .eq('status', 'active')
        .single();

      if (!data) {
        return this.getDefaultPolicy();
      }

      return {
        version: data.version,
        effectiveDate: new Date(data.effective_date),
        rules: data.rules || [],
        changelog: data.changelog || [],
      };
    } catch (error) {
      console.error('Policy retrieval failed:', error);
      return this.getDefaultPolicy();
    }
  }

  /**
   * Analyze rule performance and suggest improvements
   */
  async analyzeRulePerformance(ruleId: string): Promise<PolicyAnalytics> {
    try {
      // Get enforcement logs for this rule
      const { data } = await (this.supabase
        .from('enforcement_log') as any)
        .select('*')
        .contains('issues_found', [{ field: ruleId }])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      const totalChecks = data?.length || 0;
      const passCount = data?.filter((log: any) => log.action_taken === 'submission_allowed').length || 0;
      const failCount = data?.filter((log: any) => log.action_taken === 'submission_blocked').length || 0;
      const overrideCount = data?.filter((log: any) => log.action_taken === 'manager_approval_required').length || 0;

      // Calculate average attempts
      const attempts = data?.map((log: any) => log.attempt_number) || [];
      const averageAttempts = attempts.length > 0
        ? attempts.reduce((sum: number, a: number) => sum + a, 0) / attempts.length
        : 1;

      // Extract common failure reasons
      const commonFailures = this.extractCommonFailures(data || []);

      return {
        ruleId,
        totalChecks,
        passCount,
        failCount,
        overrideCount,
        averageAttempts,
        commonFailures,
      };
    } catch (error) {
      console.error('Rule analytics failed:', error);
      return {
        ruleId,
        totalChecks: 0,
        passCount: 0,
        failCount: 0,
        overrideCount: 0,
        averageAttempts: 1,
        commonFailures: [],
      };
    }
  }

  /**
   * Generate rule suggestions based on analytics
   */
  async generateRuleSuggestions(): Promise<RuleSuggestion[]> {
    const currentPolicy = await this.getCurrentPolicy();
    const suggestions: RuleSuggestion[] = [];

    // Analyze each rule
    for (const rule of currentPolicy.rules) {
      const analytics = await this.analyzeRulePerformance(rule.id);

      // Suggest adjustments based on performance
      if (analytics.overrideCount > analytics.totalChecks * 0.3) {
        // If >30% require override, rule might be too strict
        suggestions.push({
          ruleId: rule.id,
          field: rule.field,
          ruleType: rule.ruleType,
          parameters: this.suggestRelaxedParameters(rule, analytics),
          reason: `High override rate (${Math.round(analytics.overrideCount / analytics.totalChecks * 100)}%) suggests rule may be too strict`,
          confidence: 0.7,
          suggestedBy: 'analytics',
        });
      }

      if (analytics.averageAttempts > 2.5) {
        // If average attempts > 2.5, rule might be unclear
        suggestions.push({
          ruleId: rule.id,
          field: rule.field,
          ruleType: rule.ruleType,
          parameters: rule.parameters, // Keep same parameters but improve messaging
          reason: `High average attempts (${analytics.averageAttempts.toFixed(1)}) suggests rule clarity needs improvement`,
          confidence: 0.8,
          suggestedBy: 'analytics',
        });
      }

      // Check for common failures that might indicate missing rule
      if (analytics.commonFailures.length > 0 && analytics.commonFailures[0].count > 10) {
        suggestions.push({
          field: rule.field,
          ruleType: 'completeness',
          parameters: {
            requiredElements: analytics.commonFailures[0].element,
          },
          reason: `Commonly missing: ${analytics.commonFailures[0].element}. Consider making this a required element.`,
          confidence: 0.75,
          suggestedBy: 'analytics',
        });
      }
    }

    return suggestions;
  }

  /**
   * Create new policy version with updated rules
   */
  async createPolicyVersion(
    rules: PolicyRule[],
    changelog: string[],
    adminId: string
  ): Promise<PolicyVersion> {
    try {
      const version = await this.generateNextVersion();

      const { data, error } = await (this.supabase
        .from('policy_versions') as any)
        .insert({
          version,
          effective_date: new Date().toISOString(),
          status: 'active',
          rules,
          changelog,
          created_by: adminId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Deactivate previous version
      await (this.supabase
        .from('policy_versions') as any)
        .update({ status: 'inactive' })
        .neq('version', version)
        .eq('status', 'active');

      return {
        version: data.version,
        effectiveDate: new Date(data.effective_date),
        rules: data.rules,
        changelog: data.changelog,
      };
    } catch (error) {
      console.error('Policy version creation failed:', error);
      throw error;
    }
  }

  /**
   * Extract common failure reasons from logs
   */
  private extractCommonFailures(logs: any[]): Array<{ element: string; count: number }> {
    const failureCounts = new Map<string, number>();

    for (const log of logs) {
      if (log.requirements_missing) {
        for (const req of log.requirements_missing) {
          const key = req.field || req.message;
          failureCounts.set(key, (failureCounts.get(key) || 0) + 1);
        }
      }
    }

    return Array.from(failureCounts.entries())
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Suggest relaxed parameters for a rule
   */
  private suggestRelaxedParameters(
    rule: PolicyRule,
    analytics: PolicyAnalytics
  ): Record<string, any> {
    const params = { ...rule.parameters };

    // Example: Reduce minimum length by 10% if rule is too strict
    if (rule.ruleType === 'minLength' && params.minLength) {
      params.minLength = Math.max(50, Math.floor(params.minLength * 0.9));
    }

    return params;
  }

  /**
   * Generate next version number
   */
  private async generateNextVersion(): Promise<string> {
      const { data } = await (this.supabase
        .from('policy_versions') as any)
        .select('version')
        .order('created_at', { ascending: false })
        .limit(1)
      .single();

    if (!data) {
      return '1.0.0';
    }

    const [major, minor, patch] = data.version.split('.').map(Number);
    return `${major}.${minor + 1}.0`; // Increment minor version
  }

  /**
   * Get default policy
   */
  private getDefaultPolicy(): PolicyVersion {
    return {
      version: '1.0.0',
      effectiveDate: new Date(),
      rules: [],
      changelog: ['Initial policy version'],
    };
  }
}

