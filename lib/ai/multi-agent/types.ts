/**
 * Multi-Agent System Types
 * Type definitions for agent results, conflicts, and orchestration
 */

export interface AgentResult {
  requirements: Array<{
    field: string;
    message: string;
    reference?: string;
    exampleFix?: string;
  }>;
  errors: Array<{
    field: string;
    message: string;
    brcgs_requirement?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
  confidence: number; // 0-1
  reasoning: string; // Explainable AI: why this agent made these findings
}

export interface AgentConflict {
  field: string;
  conflictingAgents: string[];
  conflictingFindings: Array<{
    agent: string;
    severity: string;
    message: string;
  }>;
  resolution: 'pending' | 'resolved' | 'escalated';
}

export interface AgentAuditLog {
  agentName: string;
  timestamp: Date;
  formType: 'nca' | 'mjc';
  formId?: string;
  userId: string;
  findings: AgentResult;
  executionTimeMs: number;
  conflicts?: AgentConflict[];
}

