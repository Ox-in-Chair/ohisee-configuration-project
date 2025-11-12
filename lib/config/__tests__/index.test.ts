/**
 * Unit Tests for lib/config/index.ts
 * Test getConfig() and validateConfiguration() functions
 */

import { getConfig, validateConfiguration } from '../index';
import { AI_CONFIG, DB_CONFIG, FEATURES } from '../constants';

describe('lib/config/index - getConfig()', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('environment detection', () => {
    test('detects development environment', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.environment.isDevelopment).toBe(true);
      expect(config.environment.isTest).toBe(false);
      expect(config.environment.isProduction).toBe(false);
    });

    test('detects test environment', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.environment.isDevelopment).toBe(false);
      expect(config.environment.isTest).toBe(true);
      expect(config.environment.isProduction).toBe(false);
    });

    test('detects production environment', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.environment.isDevelopment).toBe(false);
      expect(config.environment.isTest).toBe(false);
      expect(config.environment.isProduction).toBe(true);
    });
  });

  describe('AI configuration overrides', () => {
    test('uses lower quality threshold in development', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.ai.qualityThreshold).toBe(AI_CONFIG.QUALITY_THRESHOLD_DEV);
      expect(config.ai.qualityThreshold).toBeLessThan(AI_CONFIG.QUALITY_THRESHOLD);
    });

    test('uses production quality threshold in production', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.ai.qualityThreshold).toBe(AI_CONFIG.QUALITY_THRESHOLD);
    });

    test('uses production quality threshold in test', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.ai.qualityThreshold).toBe(AI_CONFIG.QUALITY_THRESHOLD);
    });

    test('uses shorter timeouts in test environment', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.ai.fastResponseTimeout).toBe(500);
      expect(config.ai.fastResponseTimeout).toBeLessThan(AI_CONFIG.FAST_RESPONSE_TIMEOUT);

      expect(config.ai.deepValidationTimeout).toBe(5000);
      expect(config.ai.deepValidationTimeout).toBeLessThan(AI_CONFIG.DEEP_VALIDATION_TIMEOUT);
    });

    test('uses production timeouts in development', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.ai.fastResponseTimeout).toBe(AI_CONFIG.FAST_RESPONSE_TIMEOUT);
      expect(config.ai.deepValidationTimeout).toBe(AI_CONFIG.DEEP_VALIDATION_TIMEOUT);
    });

    test('uses production timeouts in production', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.ai.fastResponseTimeout).toBe(AI_CONFIG.FAST_RESPONSE_TIMEOUT);
      expect(config.ai.deepValidationTimeout).toBe(AI_CONFIG.DEEP_VALIDATION_TIMEOUT);
    });

    test('disables rate limiting in test environment', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.ai.rateLimitEnabled).toBe(false);
    });

    test('enables rate limiting in development', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.ai.rateLimitEnabled).toBe(true);
    });

    test('enables rate limiting in production', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.ai.rateLimitEnabled).toBe(true);
    });
  });

  describe('database configuration overrides', () => {
    test('uses smaller page size in test', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.database.pageSize).toBe(DB_CONFIG.PAGE_SIZE_SMALL);
      expect(config.database.pageSize).toBeLessThan(DB_CONFIG.PAGE_SIZE);
    });

    test('uses default page size in development', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.database.pageSize).toBe(DB_CONFIG.PAGE_SIZE);
    });

    test('uses default page size in production', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.database.pageSize).toBe(DB_CONFIG.PAGE_SIZE);
    });

    test('uses shorter timeout in test', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.database.timeout).toBe(5000);
      expect(config.database.timeout).toBeLessThan(DB_CONFIG.TIMEOUT_MS);
    });

    test('uses default timeout in development', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.database.timeout).toBe(DB_CONFIG.TIMEOUT_MS);
    });

    test('uses default timeout in production', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.database.timeout).toBe(DB_CONFIG.TIMEOUT_MS);
    });
  });

  describe('feature flag overrides', () => {
    test('enables debug logging only in development', () => {
      process.env.NODE_ENV = 'development';
      const devConfig = getConfig();
      expect(devConfig.features.ENABLE_DEBUG_LOGGING).toBe(true);

      process.env.NODE_ENV = 'test';
      const testConfig = getConfig();
      expect(testConfig.features.ENABLE_DEBUG_LOGGING).toBe(false);

      process.env.NODE_ENV = 'production';
      const prodConfig = getConfig();
      expect(prodConfig.features.ENABLE_DEBUG_LOGGING).toBe(false);
    });

    test('disables real-time updates in test', () => {
      process.env.NODE_ENV = 'test';

      const config = getConfig();

      expect(config.features.ENABLE_REAL_TIME_UPDATES).toBe(false);
    });

    test('disables real-time updates in development', () => {
      process.env.NODE_ENV = 'development';

      const config = getConfig();

      expect(config.features.ENABLE_REAL_TIME_UPDATES).toBe(false);
    });

    test('respects FEATURES constant for real-time updates in production', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.features.ENABLE_REAL_TIME_UPDATES).toBe(FEATURES.ENABLE_REAL_TIME_UPDATES);
    });

    test('preserves all other feature flags', () => {
      process.env.NODE_ENV = 'production';

      const config = getConfig();

      expect(config.features.ENABLE_AI_QUALITY_GATE).toBe(FEATURES.ENABLE_AI_QUALITY_GATE);
      expect(config.features.ENABLE_AI_SUGGESTIONS).toBe(FEATURES.ENABLE_AI_SUGGESTIONS);
      expect(config.features.ENABLE_SUPPLIER_PERFORMANCE).toBe(FEATURES.ENABLE_SUPPLIER_PERFORMANCE);
      expect(config.features.ENABLE_LAZY_LOADING).toBe(FEATURES.ENABLE_LAZY_LOADING);
    });
  });

  describe('phase7 configuration inclusion', () => {
    test('includes phase7 configuration', () => {
      const config = getConfig();

      expect(config.phase7).toBeDefined();
      expect(config.phase7).toHaveProperty('multiAgent');
      expect(config.phase7).toHaveProperty('rag');
      expect(config.phase7).toHaveProperty('userGuided');
      expect(config.phase7).toHaveProperty('adaptivePolicy');
      expect(config.phase7).toHaveProperty('explainableAI');
    });
  });

  describe('configuration structure consistency', () => {
    test('always returns same structure regardless of environment', () => {
      const environments = ['development', 'test', 'production'];

      const configs = environments.map(env => {
        process.env.NODE_ENV = env;
        return getConfig();
      });

      // All configs should have same top-level keys
      const keys = Object.keys(configs[0]!);
      configs.forEach(config => {
        expect(Object.keys(config)).toEqual(keys);
      });
    });

    test('returns configuration with expected top-level keys', () => {
      const config = getConfig();

      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('ai');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('phase7');
    });
  });
});

describe('lib/config/index - validateConfiguration()', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('required environment variables', () => {
    test('returns valid when all required variables are set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const result = validateConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const result = validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
    });

    test('returns invalid when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const result = validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
    });

    test('returns invalid when ANTHROPIC_API_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      delete process.env.ANTHROPIC_API_KEY;

      const result = validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: ANTHROPIC_API_KEY');
    });

    test('returns multiple errors when multiple variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const result = validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
      expect(result.errors).toContain('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(result.errors).toContain('Missing required environment variable: ANTHROPIC_API_KEY');
    });
  });

  describe('AI configuration validation', () => {
    beforeEach(() => {
      // Set required env vars so we can test AI config validation
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    });

    test('validates quality threshold is within 0-100 range', () => {
      // Quality threshold from constants should be valid
      const result = validateConfiguration();

      expect(result.valid).toBe(true);
      expect(AI_CONFIG.QUALITY_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(AI_CONFIG.QUALITY_THRESHOLD).toBeLessThanOrEqual(100);
    });

    test('validates timeout ordering', () => {
      const result = validateConfiguration();

      expect(result.valid).toBe(true);
      expect(AI_CONFIG.FAST_RESPONSE_TIMEOUT).toBeLessThan(AI_CONFIG.DEEP_VALIDATION_TIMEOUT);
    });
  });

  describe('validation response structure', () => {
    test('returns object with valid and errors properties', () => {
      const result = validateConfiguration();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('errors array is empty when valid', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const result = validateConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('errors array contains strings when invalid', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const result = validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty string environment variables as missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
      process.env.ANTHROPIC_API_KEY = '';

      const result = validateConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validation is idempotent', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const result1 = validateConfiguration();
      const result2 = validateConfiguration();
      const result3 = validateConfiguration();

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
