/**
 * Phase 7 Feature Configuration
 * Central configuration for enabling all advanced AI features
 */

export interface Phase7Config {
  multiAgent: {
    enabled: boolean;
    agents: {
      contentCompletion: boolean;
      anomalyDetection: boolean;
      contextAlignment: boolean;
    };
    conflictResolution: 'priority' | 'consensus' | 'weighted';
    parallelExecution: boolean;
  };
  rag: {
    enabled: boolean;
    fineTuning: {
      enabled: boolean;
      modelId?: string;
      temperature?: number;
      maxTokens?: number;
    };
  };
  userGuided: {
    enabled: boolean;
  };
  adaptivePolicy: {
    enabled: boolean;
  };
  explainableAI: {
    enabled: boolean;
    showUserExplanations: boolean;
    showSupervisorInsights: boolean;
  };
}

/**
 * Get Phase 7 configuration
 * All features enabled by default
 */
export function getPhase7Config(): Phase7Config {
  // Check environment variables for overrides
  const envEnabled = process.env['PHASE7_ENABLED'] !== 'false';
  const multiAgentEnabled = process.env['PHASE7_MULTI_AGENT'] !== 'false';
  const ragEnabled = process.env['PHASE7_RAG'] !== 'false';
  const userGuidedEnabled = process.env['PHASE7_USER_GUIDED'] !== 'false';
  const adaptivePolicyEnabled = process.env['PHASE7_ADAPTIVE_POLICY'] !== 'false';
  const explainableEnabled = process.env['PHASE7_EXPLAINABLE_AI'] !== 'false';

  return {
    multiAgent: {
      enabled: envEnabled && multiAgentEnabled,
      agents: {
        contentCompletion: true,
        anomalyDetection: true,
        contextAlignment: true,
      },
      conflictResolution: (process.env['PHASE7_CONFLICT_RESOLUTION'] as any) || 'priority',
      parallelExecution: true,
    },
    rag: {
      enabled: envEnabled && ragEnabled,
      fineTuning: {
        enabled: process.env['PHASE7_FINE_TUNING'] === 'true',
        ...(process.env['PHASE7_FINE_TUNED_MODEL_ID'] ? { modelId: process.env['PHASE7_FINE_TUNED_MODEL_ID'] } : {}),
        temperature: process.env['PHASE7_TEMPERATURE'] ? parseFloat(process.env['PHASE7_TEMPERATURE']) : 0.3,
        maxTokens: process.env['PHASE7_MAX_TOKENS'] ? parseInt(process.env['PHASE7_MAX_TOKENS']) : 4096,
      },
    },
    userGuided: {
      enabled: envEnabled && userGuidedEnabled,
    },
    adaptivePolicy: {
      enabled: envEnabled && adaptivePolicyEnabled,
    },
    explainableAI: {
      enabled: envEnabled && explainableEnabled,
      showUserExplanations: true,
      showSupervisorInsights: true,
    },
  };
}

/**
 * Check if Phase 7 is enabled
 */
export function isPhase7Enabled(): boolean {
  return getPhase7Config().multiAgent.enabled ||
         getPhase7Config().rag.enabled ||
         getPhase7Config().userGuided.enabled ||
         getPhase7Config().adaptivePolicy.enabled ||
         getPhase7Config().explainableAI.enabled;
}

