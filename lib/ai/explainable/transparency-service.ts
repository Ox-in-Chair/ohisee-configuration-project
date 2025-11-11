/**
 * Explainable AI & Transparency Service (2027)
 * Provides clear, non-technical explanations for validation decisions
 * 
 * Features:
 * - User-facing explanations
 * - Supervisor/manager insights
 * - Model decision logging
 * - Regulatory alignment reports
 */

import type { ValidationResult, Requirement, ValidationError } from '../types';
import type { AgentResult } from '../multi-agent/types';

export interface Explanation {
  field: string;
  decision: 'pass' | 'fail' | 'warning';
  reason: string; // Plain language explanation
  ruleReference?: string;
  example?: string;
  confidence: number;
}

export interface SupervisorInsight {
  summary: string;
  agentFindings: Array<{
    agentName: string;
    findings: string[];
    confidence: number;
  }>;
  conflicts?: Array<{
    field: string;
    conflictingAgents: string[];
    resolution: string;
  }>;
}

export interface DecisionTrace {
  timestamp: Date;
  formType: 'nca' | 'mjc';
  formId?: string;
  userId: string;
  validationResult: ValidationResult;
  explanations: Explanation[];
  agentTraces?: AgentResult[];
  policyVersion: string;
}

export class TransparencyService {
  /**
   * Generate user-facing explanation for a validation decision
   */
  explainValidationDecision(
    field: string,
    requirement: Requirement | ValidationError,
    validationResult: ValidationResult
  ): Explanation {
    const isError = 'brcgs_requirement' in requirement;
    const decision = isError ? 'fail' : validationResult.quality_assessment.score >= 75 ? 'pass' : 'warning';

    // Generate plain language explanation
    const reason = this.generatePlainLanguageReason(field, requirement, isError);

    return {
      field,
      decision,
      reason,
      ruleReference: ('reference' in requirement ? requirement.reference : undefined) || ('brcgs_requirement' in requirement ? requirement.brcgs_requirement : undefined),
      example: 'exampleFix' in requirement ? requirement.exampleFix : undefined,
      confidence: validationResult.quality_assessment.score / 100,
    };
  }

  /**
   * Generate supervisor insights from multi-agent validation
   */
  generateSupervisorInsights(
    validationResult: ValidationResult,
    agentTraces?: AgentResult[]
  ): SupervisorInsight {
    const summary = this.generateSummary(validationResult);

    const agentFindings = agentTraces?.map(trace => ({
      agentName: this.getAgentDisplayName(trace),
      findings: this.extractFindings(trace),
      confidence: trace.confidence,
    })) || [];

    const conflicts = this.identifyConflicts(agentTraces || []);

    return {
      summary,
      agentFindings,
      conflicts,
    };
  }

  /**
   * Create decision trace for audit
   */
  createDecisionTrace(
    formType: 'nca' | 'mjc',
    formId: string | undefined,
    userId: string,
    validationResult: ValidationResult,
    agentTraces?: AgentResult[],
    policyVersion: string = '1.0.0'
  ): DecisionTrace {
    // Generate explanations for all requirements and errors
    const explanations: Explanation[] = [];

    if (validationResult.requirements) {
      for (const req of validationResult.requirements) {
        explanations.push(
          this.explainValidationDecision('requirements', req as any, validationResult)
        );
      }
    }

    if (validationResult.errors) {
      for (const err of validationResult.errors) {
        explanations.push(
          this.explainValidationDecision('errors', err as any, validationResult)
        );
      }
    }

    return {
      timestamp: new Date(),
      formType,
      formId,
      userId,
      validationResult,
      explanations,
      agentTraces,
      policyVersion,
    };
  }

  /**
   * Generate regulatory alignment report
   */
  generateRegulatoryReport(decisionTrace: DecisionTrace): string {
    const sections: string[] = [];

    sections.push(`Report #${decisionTrace.formId || 'DRAFT'}: Validation Analysis`);
    sections.push(`Date: ${decisionTrace.timestamp.toISOString()}`);
    sections.push(`Policy Version: ${decisionTrace.policyVersion}`);
    sections.push('');

    if (decisionTrace.validationResult.valid) {
      sections.push('Status: PASSED');
      sections.push('All validation checks passed. Submission meets quality standards.');
    } else {
      sections.push('Status: BLOCKED');
      sections.push('Submission requires improvement before processing.');
    }

    sections.push('');
    sections.push('Validation Breakdown:');

    for (const explanation of decisionTrace.explanations) {
      sections.push(`- ${explanation.field}: ${explanation.decision.toUpperCase()}`);
      sections.push(`  Reason: ${explanation.reason}`);
      if (explanation.ruleReference) {
        sections.push(`  Reference: ${explanation.ruleReference}`);
      }
    }

    if (decisionTrace.agentTraces && decisionTrace.agentTraces.length > 0) {
      sections.push('');
      sections.push('Agent Analysis:');
      for (const trace of decisionTrace.agentTraces) {
        sections.push(`- ${this.getAgentDisplayName(trace)}: ${trace.reasoning}`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate plain language reason for a requirement/error
   */
  private generatePlainLanguageReason(
    field: string,
    requirement: Requirement | ValidationError,
    isError: boolean
  ): string {
    const message = requirement.message;

    // Convert technical messages to plain language
    if (message.includes('too short') || message.includes('minimum')) {
      return `Your ${field} needs more detail. Our system expects more information to ensure we have a complete record of what happened.`;
    }

    if (message.includes('missing')) {
      return `Your ${field} is missing some required information. Please add the details mentioned above.`;
    }

    if (message.includes('too vague') || message.includes('too generic')) {
      return `Your ${field} needs to be more specific. Instead of general terms, please provide concrete details about what happened.`;
    }

    if (message.includes('5-Why') || message.includes('root cause')) {
      return `Your root cause analysis needs more depth. Please ask "why" multiple times to identify the underlying cause, not just the immediate one.`;
    }

    if (message.includes('procedure') || message.includes('SOP') || message.includes('BRCGS')) {
      return `Your ${field} should reference relevant procedures. This helps ensure we're following established guidelines.`;
    }

    // Default: return message as-is if no pattern matches
    return message;
  }

  /**
   * Generate summary for supervisor
   */
  private generateSummary(validationResult: ValidationResult): string {
    if (validationResult.valid) {
      return 'All validation checks passed. Submission meets quality standards.';
    }

    const errorCount = validationResult.errors?.length || 0;
    const requirementCount = validationResult.requirements?.length || 0;

    if (errorCount > 0) {
      return `Submission blocked: ${errorCount} critical issue(s) found that must be addressed before submission.`;
    }

    if (requirementCount > 0) {
      return `Submission requires improvement: ${requirementCount} additional detail(s) needed to meet quality standards.`;
    }

    return 'Submission requires review.';
  }

  /**
   * Get display name for agent
   */
  private getAgentDisplayName(trace: AgentResult & { agentName?: string }): string {
    const name = trace.agentName || 'unknown';
    const displayNames: Record<string, string> = {
      'content-completion': 'Content Completion Agent',
      'anomaly-detection': 'Anomaly Detection Agent',
      'context-alignment': 'Context Alignment Agent',
    };
    return displayNames[name] || name;
  }

  /**
   * Extract findings from agent trace
   */
  private extractFindings(trace: AgentResult): string[] {
    const findings: string[] = [];

    if (trace.errors.length > 0) {
      findings.push(`${trace.errors.length} critical issue(s) found`);
    }

    if (trace.requirements.length > 0) {
      findings.push(`${trace.requirements.length} missing requirement(s) identified`);
    }

    if (trace.warnings.length > 0) {
      findings.push(`${trace.warnings.length} warning(s) raised`);
    }

    return findings;
  }

  /**
   * Identify conflicts between agents
   */
  private identifyConflicts(agentTraces: Array<AgentResult & { agentName?: string }>): Array<{
    field: string;
    conflictingAgents: string[];
    resolution: string;
  }> {
    // Simplified conflict detection
    // In production, use more sophisticated conflict resolution
    const conflicts: Array<{
      field: string;
      conflictingAgents: string[];
      resolution: string;
    }> = [];

    // Check for contradictory findings on same field
    const fieldFindings = new Map<string, string[]>();

    for (const trace of agentTraces) {
      for (const req of trace.requirements) {
        if (!fieldFindings.has(req.field)) {
          fieldFindings.set(req.field, []);
        }
        fieldFindings.get(req.field)!.push(trace.agentName || 'unknown');
      }
    }

    for (const [field, agents] of fieldFindings.entries()) {
      if (agents.length > 1 && new Set(agents).size > 1) {
        conflicts.push({
          field,
          conflictingAgents: Array.from(new Set(agents)),
          resolution: 'Resolved using priority-based conflict resolution',
        });
      }
    }

    return conflicts;
  }
}

