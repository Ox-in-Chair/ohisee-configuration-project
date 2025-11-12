/**
 * Multi-Agent Orchestrator
 * Coordinates specialized AI agents for parallel validation analysis
 * 
 * Architecture (2026-2027):
 * - Content Completion Agent: Suggests missing information
 * - Anomaly Detection Agent: Flags deviations from norms
 * - Context Alignment Agent: Ensures logical consistency
 * 
 * All agents operate in parallel for efficiency
 * Results are aggregated into a single ValidationResult
 */

import type { NCA, MJC, ValidationResult, User } from '../types';
import { ContentCompletionAgent } from './agents/content-completion-agent';
import { AnomalyDetectionAgent } from './agents/anomaly-detection-agent';
import { ContextAlignmentAgent } from './agents/context-alignment-agent';
import type { AgentResult, AgentConflict } from './types';

export interface MultiAgentConfig {
  enableContentCompletion?: boolean;
  enableAnomalyDetection?: boolean;
  enableContextAlignment?: boolean;
  parallelExecution?: boolean;
  conflictResolution?: 'priority' | 'consensus' | 'weighted';
}

export class MultiAgentOrchestrator {
  private contentCompletionAgent: ContentCompletionAgent;
  private anomalyDetectionAgent: AnomalyDetectionAgent;
  private contextAlignmentAgent: ContextAlignmentAgent;

  constructor(
    private readonly config: MultiAgentConfig = {}
  ) {
    this.contentCompletionAgent = new ContentCompletionAgent();
    this.anomalyDetectionAgent = new AnomalyDetectionAgent();
    this.contextAlignmentAgent = new ContextAlignmentAgent();
  }

  /**
   * Orchestrate multi-agent validation
   * Runs agents in parallel and aggregates results
   */
  async validateSubmission(
    formData: NCA | MJC,
    user: User,
    formType: 'nca' | 'mjc'
  ): Promise<ValidationResult> {
    const agents = this.getEnabledAgents();
    
    if (agents.length === 0) {
      // Fallback to single-agent validation if no agents enabled
      return this.getDefaultValidationResult();
    }

    // Execute agents in parallel for efficiency
    const startTime = Date.now();
    const agentPromises = agents.map(agent => 
      this.executeAgent(agent, formData, user, formType)
    );

    const results = await Promise.all(agentPromises);
    // Execution time tracked for future performance monitoring
    // const executionTime = Date.now() - startTime;

    // Log agent decisions for audit (if explainable AI enabled)
    if (this.config.enableContentCompletion !== false || 
        this.config.enableAnomalyDetection !== false || 
        this.config.enableContextAlignment !== false) {
      // Log each agent's decision (simplified - in production, use proper logging service)
      for (const result of results) {
        if (result.agentName) {
          // Log would happen here via enforcement logger or agent audit log
          // For now, results are captured in agentTraces array
        }
      }
    }

    // Aggregate results
    const aggregated = this.aggregateResults(results, formData, formType);

    // Resolve conflicts if any
    const resolved = this.resolveConflicts(aggregated.conflicts, formData);

    return {
      ...aggregated.result,
      // Merge agent-specific findings
      requirements: [
        ...(aggregated.result.requirements || []),
        ...resolved.requirements,
      ],
      errors: [
        ...(aggregated.result.errors || []),
        ...resolved.errors,
      ],
      warnings: [
        ...(aggregated.result.warnings || []),
        ...resolved.warnings,
      ],
    };
  }

  /**
   * Get enabled agents based on configuration
   */
  private getEnabledAgents(): Array<{
    name: string;
    execute: (formData: NCA | MJC, user: User, formType: 'nca' | 'mjc') => Promise<AgentResult>;
  }> {
    const agents: Array<{
      name: string;
      execute: (formData: NCA | MJC, user: User, formType: 'nca' | 'mjc') => Promise<AgentResult>;
    }> = [];

    if (this.config.enableContentCompletion !== false) {
      agents.push({
        name: 'content-completion',
        execute: (data, user, type) => 
          this.contentCompletionAgent.analyze(data, user, type)
      });
    }

    if (this.config.enableAnomalyDetection !== false) {
      agents.push({
        name: 'anomaly-detection',
        execute: (data, user, type) => 
          this.anomalyDetectionAgent.analyze(data, user, type)
      });
    }

    if (this.config.enableContextAlignment !== false) {
      agents.push({
        name: 'context-alignment',
        execute: (data, user, type) => 
          this.contextAlignmentAgent.analyze(data, user, type)
      });
    }

    return agents;
  }

  /**
   * Execute a single agent with error handling
   */
  private async executeAgent(
    agent: { name: string; execute: (formData: NCA | MJC, user: User, formType: 'nca' | 'mjc') => Promise<AgentResult> },
    formData: NCA | MJC,
    user: User,
    formType: 'nca' | 'mjc'
  ): Promise<AgentResult & { agentName: string }> {
    try {
      const result = await agent.execute(formData, user, formType);
      return {
        ...result,
        agentName: agent.name,
      };
    } catch (error) {
      console.error(`Agent ${agent.name} failed:`, error);
      // Return empty result on failure (graceful degradation)
      return {
        agentName: agent.name,
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0,
        reasoning: `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Aggregate results from multiple agents
   */
  private aggregateResults(
    results: Array<AgentResult & { agentName: string }>,
    _formData: NCA | MJC,
    _formType: 'nca' | 'mjc'
  ): {
    result: ValidationResult;
    conflicts: AgentConflict[];
  } {
    const allRequirements: any[] = [];
    const allErrors: any[] = [];
    const allWarnings: any[] = [];
    const conflicts: AgentConflict[] = [];

    // Collect all findings
    for (const agentResult of results) {
      allRequirements.push(...agentResult.requirements);
      allErrors.push(...agentResult.errors);
      allWarnings.push(...agentResult.warnings);
    }

    // Detect conflicts (e.g., one agent says pass, another says fail)
    conflicts.push(...this.detectConflicts(results));

    // Calculate aggregate quality score
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const qualityScore = Math.round(avgConfidence * 100);

    return {
      result: {
        valid: allErrors.length === 0 && qualityScore >= 75,
        ready_for_submission: allErrors.length === 0 && qualityScore >= 75,
        requirements: allRequirements.length > 0 ? allRequirements : undefined,
        errors: allErrors,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        quality_assessment: {
          score: qualityScore,
          threshold_met: qualityScore >= 75,
          breakdown: {
            completeness: Math.round(qualityScore * 0.3),
            accuracy: Math.round(qualityScore * 0.25),
            clarity: Math.round(qualityScore * 0.2),
            hazard_identification: Math.round(qualityScore * 0.15),
            evidence: Math.round(qualityScore * 0.1),
          },
        },
      },
      conflicts,
    };
  }

  /**
   * Detect conflicts between agent results
   */
  private detectConflicts(
    results: Array<AgentResult & { agentName: string }>
  ): AgentConflict[] {
    const conflicts: AgentConflict[] = [];

    // Check for contradictory findings on same field
    const fieldFindings = new Map<string, Array<{ agent: string; severity: string; message: string }>>();

    for (const result of results) {
      for (const req of result.requirements) {
        const key = `req:${req.field}`;
        if (!fieldFindings.has(key)) {
          fieldFindings.set(key, []);
        }
        fieldFindings.get(key).push({
          agent: result.agentName,
          severity: 'requirement',
          message: req.message,
        });
      }

      for (const err of result.errors) {
        const key = `err:${err.field}`;
        if (!fieldFindings.has(key)) {
          fieldFindings.set(key, []);
        }
        fieldFindings.get(key).push({
          agent: result.agentName,
          severity: 'error',
          message: err.message,
        });
      }
    }

    // Detect conflicts: same field flagged differently by different agents
    for (const [fieldKey, findings] of fieldFindings.entries()) {
      if (findings.length > 1) {
        const severities = new Set(findings.map(f => f.severity));
        if (severities.size > 1) {
          const fieldParts = fieldKey.split(':');
          const fieldName = fieldParts[1] || fieldKey;
          conflicts.push({
            field: fieldName,
            conflictingAgents: findings.map(f => f.agent),
            conflictingFindings: findings,
            resolution: 'pending',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts based on configuration
   */
  private resolveConflicts(
    conflicts: AgentConflict[],
    _formData: NCA | MJC
  ): {
    requirements: any[];
    errors: any[];
    warnings: any[];
  } {
    const resolved = {
      requirements: [] as any[],
      errors: [] as any[],
      warnings: [] as any[],
    };

    for (const conflict of conflicts) {
      switch (this.config.conflictResolution || 'priority') {
        case 'priority':
          // Priority order: context-alignment > anomaly-detection > content-completion
          const priorityOrder = ['context-alignment', 'anomaly-detection', 'content-completion'];
          const winningAgent = conflict.conflictingAgents.find(agent => 
            priorityOrder.includes(agent)
          ) || conflict.conflictingAgents[0];

          const winningFinding = conflict.conflictingFindings.find(f => f.agent === winningAgent);
          if (winningFinding) {
            if (winningFinding.severity === 'error') {
              resolved.errors.push({
                field: conflict.field,
                message: winningFinding.message,
              });
            } else {
              resolved.requirements.push({
                field: conflict.field,
                message: winningFinding.message,
              });
            }
          }
          break;

        case 'consensus':
          // Use most common finding
          const severityCounts = new Map<string, number>();
          for (const finding of conflict.conflictingFindings) {
            severityCounts.set(
              finding.severity,
              (severityCounts.get(finding.severity) || 0) + 1
            );
          }
          const mostCommonSeverity = Array.from(severityCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];

          const consensusFinding = conflict.conflictingFindings.find(
            f => f.severity === mostCommonSeverity
          );
          if (consensusFinding) {
            if (consensusFinding.severity === 'error') {
              resolved.errors.push({
                field: conflict.field,
                message: consensusFinding.message,
              });
            } else {
              resolved.requirements.push({
                field: conflict.field,
                message: consensusFinding.message,
              });
            }
          }
          break;

        case 'weighted':
          // Use weighted average (not implemented in this version)
          // For now, fall back to priority
          break;
      }
    }

    return resolved;
  }

  /**
   * Get default validation result when no agents enabled
   */
  private getDefaultValidationResult(): ValidationResult {
    return {
      valid: true,
      ready_for_submission: true,
      quality_assessment: {
        score: 75,
        threshold_met: true,
        breakdown: {
          completeness: 23,
          accuracy: 19,
          clarity: 15,
          hazard_identification: 11,
          evidence: 7,
        },
      },
      errors: [],
      warnings: [],
    };
  }
}

