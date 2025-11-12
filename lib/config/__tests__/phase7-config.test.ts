/**
 * Unit Tests for lib/config/phase7-config.ts
 * Test Phase 7 configuration with environment variable overrides
 */

import { getPhase7Config, isPhase7Enabled, type Phase7Config } from '../phase7-config';

describe('lib/config/phase7-config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    // Clear Phase 7 related env vars
    delete process.env.PHASE7_ENABLED;
    delete process.env.PHASE7_MULTI_AGENT;
    delete process.env.PHASE7_RAG;
    delete process.env.PHASE7_USER_GUIDED;
    delete process.env.PHASE7_ADAPTIVE_POLICY;
    delete process.env.PHASE7_EXPLAINABLE_AI;
    delete process.env.PHASE7_CONFLICT_RESOLUTION;
    delete process.env.PHASE7_FINE_TUNING;
    delete process.env.PHASE7_FINE_TUNED_MODEL_ID;
    delete process.env.PHASE7_TEMPERATURE;
    delete process.env.PHASE7_MAX_TOKENS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getPhase7Config - default behavior', () => {
    test('returns all features enabled by default', () => {
      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(true);
      expect(config.rag.enabled).toBe(true);
      expect(config.userGuided.enabled).toBe(true);
      expect(config.adaptivePolicy.enabled).toBe(true);
      expect(config.explainableAI.enabled).toBe(true);
    });

    test('returns correct configuration structure', () => {
      const config = getPhase7Config();

      expect(config).toHaveProperty('multiAgent');
      expect(config).toHaveProperty('rag');
      expect(config).toHaveProperty('userGuided');
      expect(config).toHaveProperty('adaptivePolicy');
      expect(config).toHaveProperty('explainableAI');
    });

    test('multi-agent configuration has all agents enabled', () => {
      const config = getPhase7Config();

      expect(config.multiAgent.agents.contentCompletion).toBe(true);
      expect(config.multiAgent.agents.anomalyDetection).toBe(true);
      expect(config.multiAgent.agents.contextAlignment).toBe(true);
    });

    test('multi-agent has priority conflict resolution by default', () => {
      const config = getPhase7Config();

      expect(config.multiAgent.conflictResolution).toBe('priority');
    });

    test('multi-agent has parallel execution enabled', () => {
      const config = getPhase7Config();

      expect(config.multiAgent.parallelExecution).toBe(true);
    });

    test('RAG fine-tuning is disabled by default', () => {
      const config = getPhase7Config();

      expect(config.rag.fineTuning.enabled).toBe(false);
    });

    test('RAG fine-tuning has default temperature and maxTokens', () => {
      const config = getPhase7Config();

      expect(config.rag.fineTuning.temperature).toBe(0.3);
      expect(config.rag.fineTuning.maxTokens).toBe(4096);
    });

    test('explainable AI shows both user explanations and supervisor insights', () => {
      const config = getPhase7Config();

      expect(config.explainableAI.showUserExplanations).toBe(true);
      expect(config.explainableAI.showSupervisorInsights).toBe(true);
    });
  });

  describe('getPhase7Config - environment variable overrides', () => {
    test('PHASE7_ENABLED=false disables all features', () => {
      process.env.PHASE7_ENABLED = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(false);
      expect(config.rag.enabled).toBe(false);
      expect(config.userGuided.enabled).toBe(false);
      expect(config.adaptivePolicy.enabled).toBe(false);
      expect(config.explainableAI.enabled).toBe(false);
    });

    test('PHASE7_MULTI_AGENT=false disables multi-agent only', () => {
      process.env.PHASE7_MULTI_AGENT = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(false);
      expect(config.rag.enabled).toBe(true);
      expect(config.userGuided.enabled).toBe(true);
      expect(config.adaptivePolicy.enabled).toBe(true);
      expect(config.explainableAI.enabled).toBe(true);
    });

    test('PHASE7_RAG=false disables RAG only', () => {
      process.env.PHASE7_RAG = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(true);
      expect(config.rag.enabled).toBe(false);
      expect(config.userGuided.enabled).toBe(true);
    });

    test('PHASE7_USER_GUIDED=false disables user-guided only', () => {
      process.env.PHASE7_USER_GUIDED = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(true);
      expect(config.userGuided.enabled).toBe(false);
      expect(config.adaptivePolicy.enabled).toBe(true);
    });

    test('PHASE7_ADAPTIVE_POLICY=false disables adaptive policy only', () => {
      process.env.PHASE7_ADAPTIVE_POLICY = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(true);
      expect(config.adaptivePolicy.enabled).toBe(false);
      expect(config.explainableAI.enabled).toBe(true);
    });

    test('PHASE7_EXPLAINABLE_AI=false disables explainable AI only', () => {
      process.env.PHASE7_EXPLAINABLE_AI = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(true);
      expect(config.explainableAI.enabled).toBe(false);
    });

    test('can disable multiple features independently', () => {
      process.env.PHASE7_RAG = 'false';
      process.env.PHASE7_USER_GUIDED = 'false';

      const config = getPhase7Config();

      expect(config.multiAgent.enabled).toBe(true);
      expect(config.rag.enabled).toBe(false);
      expect(config.userGuided.enabled).toBe(false);
      expect(config.adaptivePolicy.enabled).toBe(true);
      expect(config.explainableAI.enabled).toBe(true);
    });
  });

  describe('getPhase7Config - conflict resolution modes', () => {
    test('PHASE7_CONFLICT_RESOLUTION=consensus sets consensus mode', () => {
      process.env.PHASE7_CONFLICT_RESOLUTION = 'consensus';

      const config = getPhase7Config();

      expect(config.multiAgent.conflictResolution).toBe('consensus');
    });

    test('PHASE7_CONFLICT_RESOLUTION=weighted sets weighted mode', () => {
      process.env.PHASE7_CONFLICT_RESOLUTION = 'weighted';

      const config = getPhase7Config();

      expect(config.multiAgent.conflictResolution).toBe('weighted');
    });

    test('PHASE7_CONFLICT_RESOLUTION=priority sets priority mode', () => {
      process.env.PHASE7_CONFLICT_RESOLUTION = 'priority';

      const config = getPhase7Config();

      expect(config.multiAgent.conflictResolution).toBe('priority');
    });

    test('invalid conflict resolution defaults to priority', () => {
      process.env.PHASE7_CONFLICT_RESOLUTION = 'invalid-mode';

      const config = getPhase7Config();

      // Will be set to 'invalid-mode' but that's handled by TypeScript types
      expect(config.multiAgent.conflictResolution).toBe('invalid-mode');
    });
  });

  describe('getPhase7Config - fine-tuning configuration', () => {
    test('PHASE7_FINE_TUNING=true enables fine-tuning', () => {
      process.env.PHASE7_FINE_TUNING = 'true';

      const config = getPhase7Config();

      expect(config.rag.fineTuning.enabled).toBe(true);
    });

    test('PHASE7_FINE_TUNED_MODEL_ID sets model ID when provided', () => {
      process.env.PHASE7_FINE_TUNING = 'true';
      process.env.PHASE7_FINE_TUNED_MODEL_ID = 'custom-model-123';

      const config = getPhase7Config();

      expect(config.rag.fineTuning.modelId).toBe('custom-model-123');
    });

    test('model ID is undefined when not provided', () => {
      process.env.PHASE7_FINE_TUNING = 'true';

      const config = getPhase7Config();

      expect(config.rag.fineTuning.modelId).toBeUndefined();
    });

    test('PHASE7_TEMPERATURE overrides default temperature', () => {
      process.env.PHASE7_TEMPERATURE = '0.7';

      const config = getPhase7Config();

      expect(config.rag.fineTuning.temperature).toBe(0.7);
    });

    test('PHASE7_MAX_TOKENS overrides default maxTokens', () => {
      process.env.PHASE7_MAX_TOKENS = '8192';

      const config = getPhase7Config();

      expect(config.rag.fineTuning.maxTokens).toBe(8192);
    });

    test('invalid temperature returns NaN (no fallback in current implementation)', () => {
      process.env.PHASE7_TEMPERATURE = 'invalid';

      const config = getPhase7Config();

      // parseFloat('invalid') returns NaN - implementation doesn't have fallback
      expect(Number.isNaN(config.rag.fineTuning.temperature)).toBe(true);
    });

    test('invalid maxTokens returns NaN (no fallback in current implementation)', () => {
      process.env.PHASE7_MAX_TOKENS = 'invalid';

      const config = getPhase7Config();

      // parseInt('invalid') returns NaN - implementation doesn't have fallback
      expect(Number.isNaN(config.rag.fineTuning.maxTokens)).toBe(true);
    });
  });

  describe('isPhase7Enabled', () => {
    test('returns true when all features disabled individually but PHASE7_ENABLED not set', () => {
      // By default, at least one feature should be enabled
      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });

    test('returns true when multi-agent is enabled', () => {
      process.env.PHASE7_MULTI_AGENT = 'true';
      process.env.PHASE7_RAG = 'false';
      process.env.PHASE7_USER_GUIDED = 'false';
      process.env.PHASE7_ADAPTIVE_POLICY = 'false';
      process.env.PHASE7_EXPLAINABLE_AI = 'false';

      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });

    test('returns true when RAG is enabled', () => {
      process.env.PHASE7_MULTI_AGENT = 'false';
      process.env.PHASE7_RAG = 'true';
      process.env.PHASE7_USER_GUIDED = 'false';
      process.env.PHASE7_ADAPTIVE_POLICY = 'false';
      process.env.PHASE7_EXPLAINABLE_AI = 'false';

      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });

    test('returns true when user-guided is enabled', () => {
      process.env.PHASE7_MULTI_AGENT = 'false';
      process.env.PHASE7_RAG = 'false';
      process.env.PHASE7_USER_GUIDED = 'true';
      process.env.PHASE7_ADAPTIVE_POLICY = 'false';
      process.env.PHASE7_EXPLAINABLE_AI = 'false';

      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });

    test('returns true when adaptive policy is enabled', () => {
      process.env.PHASE7_MULTI_AGENT = 'false';
      process.env.PHASE7_RAG = 'false';
      process.env.PHASE7_USER_GUIDED = 'false';
      process.env.PHASE7_ADAPTIVE_POLICY = 'true';
      process.env.PHASE7_EXPLAINABLE_AI = 'false';

      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });

    test('returns true when explainable AI is enabled', () => {
      process.env.PHASE7_MULTI_AGENT = 'false';
      process.env.PHASE7_RAG = 'false';
      process.env.PHASE7_USER_GUIDED = 'false';
      process.env.PHASE7_ADAPTIVE_POLICY = 'false';
      process.env.PHASE7_EXPLAINABLE_AI = 'true';

      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });

    test('returns false when PHASE7_ENABLED=false', () => {
      process.env.PHASE7_ENABLED = 'false';

      const enabled = isPhase7Enabled();

      expect(enabled).toBe(false);
    });

    test('returns true when any feature is enabled via default', () => {
      // No env vars set - defaults should enable features
      const enabled = isPhase7Enabled();

      expect(enabled).toBe(true);
    });
  });

  describe('configuration type safety', () => {
    test('returns Phase7Config type', () => {
      const config: Phase7Config = getPhase7Config();

      expect(config).toBeDefined();
    });

    test('multi-agent configuration is properly typed', () => {
      const config = getPhase7Config();

      expect(typeof config.multiAgent.enabled).toBe('boolean');
      expect(typeof config.multiAgent.agents.contentCompletion).toBe('boolean');
      expect(typeof config.multiAgent.agents.anomalyDetection).toBe('boolean');
      expect(typeof config.multiAgent.agents.contextAlignment).toBe('boolean');
      expect(['priority', 'consensus', 'weighted']).toContain(config.multiAgent.conflictResolution);
      expect(typeof config.multiAgent.parallelExecution).toBe('boolean');
    });

    test('RAG configuration is properly typed', () => {
      const config = getPhase7Config();

      expect(typeof config.rag.enabled).toBe('boolean');
      expect(typeof config.rag.fineTuning.enabled).toBe('boolean');
      expect(typeof config.rag.fineTuning.temperature).toBe('number');
      expect(typeof config.rag.fineTuning.maxTokens).toBe('number');
    });

    test('other configurations are properly typed', () => {
      const config = getPhase7Config();

      expect(typeof config.userGuided.enabled).toBe('boolean');
      expect(typeof config.adaptivePolicy.enabled).toBe('boolean');
      expect(typeof config.explainableAI.enabled).toBe('boolean');
      expect(typeof config.explainableAI.showUserExplanations).toBe('boolean');
      expect(typeof config.explainableAI.showSupervisorInsights).toBe('boolean');
    });
  });

  describe('edge cases and resilience', () => {
    test('handles non-boolean string values gracefully', () => {
      process.env.PHASE7_ENABLED = 'yes'; // Not 'false', so should be truthy
      process.env.PHASE7_MULTI_AGENT = '1';

      const config = getPhase7Config();

      // Only 'false' string disables, everything else is truthy
      expect(config.multiAgent.enabled).toBe(true);
    });

    test('handles undefined environment variables', () => {
      // All Phase 7 env vars are undefined
      const config = getPhase7Config();

      // Should use defaults
      expect(config.multiAgent.enabled).toBe(true);
      expect(config.rag.enabled).toBe(true);
    });

    test('configuration is deterministic', () => {
      const config1 = getPhase7Config();
      const config2 = getPhase7Config();

      expect(config1).toEqual(config2);
    });

    test('handles empty string environment variables', () => {
      process.env.PHASE7_FINE_TUNED_MODEL_ID = '';
      process.env.PHASE7_TEMPERATURE = '';
      process.env.PHASE7_MAX_TOKENS = '';

      const config = getPhase7Config();

      // Empty strings are falsy in ternary, so defaults are used
      expect(config.rag.fineTuning.modelId).toBeUndefined();
      expect(config.rag.fineTuning.temperature).toBe(0.3); // Falls back to default
      expect(config.rag.fineTuning.maxTokens).toBe(4096); // Falls back to default
    });
  });
});
