/**
 * AI Service Factory Tests
 * Comprehensive test coverage for factory functions and dependency injection
 * Target: >95% coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createAIService, createTestAIService } from '../factory';
import { AIService } from '../ai-service';

// Mock all dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));
jest.mock('../ai-service');
jest.mock('../rag/knowledge-base-service');
jest.mock('../audit-logger');
jest.mock('../rate-limiter');

describe('AI Service Factory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear mocks
    jest.clearAllMocks();

    // Set up test environment variables
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createAIService', () => {
    it('should create AIService with production dependencies', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      const mockAnthropicClient = { messages: { create: jest.fn() } };
      const mockSupabaseClient = { from: jest.fn() };
      const mockKnowledgeBase = {};
      const mockAuditLogger = {};
      const mockRateLimiter = {};
      const mockAIService = {};

      Anthropic.mockImplementation(() => mockAnthropicClient);
      createClient.mockReturnValue(mockSupabaseClient);
      KnowledgeBaseService.mockImplementation(() => mockKnowledgeBase);
      AuditLogger.mockImplementation(() => mockAuditLogger);
      RateLimiter.mockImplementation(() => mockRateLimiter);
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService as AIService);

      const service = createAIService();

      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-anthropic-key' });
      expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-service-key');
      expect(KnowledgeBaseService).toHaveBeenCalledWith(mockSupabaseClient);
      expect(AuditLogger).toHaveBeenCalledWith(mockSupabaseClient);
      expect(RateLimiter).toHaveBeenCalledWith({
        requests_per_minute: 10,
        requests_per_hour: 100
      });
      expect(AIService).toHaveBeenCalledWith(
        mockAnthropicClient,
        mockKnowledgeBase,
        mockAuditLogger,
        mockRateLimiter,
        undefined
      );
      expect(service).toBe(mockAIService);
    });

    it('should throw error if ANTHROPIC_API_KEY is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => createAIService()).toThrow('ANTHROPIC_API_KEY environment variable is required');
    });

    it('should throw error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => createAIService()).toThrow('Supabase environment variables are required');
    });

    it('should throw error if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createAIService()).toThrow('Supabase environment variables are required');
    });

    it('should throw error if both Supabase variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createAIService()).toThrow('Supabase environment variables are required');
    });

    it('should accept custom config and pass to AIService', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => ({} as AIService));

      const customConfig = {
        mode: 'deep' as const,
        quality_threshold: 90,
        temperature: 0.5
      };

      createAIService(customConfig);

      expect(AIService).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        customConfig
      );
    });

    it('should handle empty string environment variables', () => {
      process.env.ANTHROPIC_API_KEY = '';

      expect(() => createAIService()).toThrow('ANTHROPIC_API_KEY environment variable is required');
    });

    it('should handle undefined environment variables', () => {
      process.env.ANTHROPIC_API_KEY = undefined;

      expect(() => createAIService()).toThrow('ANTHROPIC_API_KEY environment variable is required');
    });

    it('should create RateLimiter with default limits', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => ({} as AIService));

      createAIService();

      expect(RateLimiter).toHaveBeenCalledWith({
        requests_per_minute: 10,
        requests_per_hour: 100
      });
    });

    it('should create multiple independent AIService instances', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      const mockAIService1 = { id: 'service1' } as unknown as AIService;
      const mockAIService2 = { id: 'service2' } as unknown as AIService;

      Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));

      (AIService as jest.MockedClass<typeof AIService>)
        .mockImplementationOnce(() => mockAIService1)
        .mockImplementationOnce(() => mockAIService2);

      const service1 = createAIService();
      const service2 = createAIService();

      expect(service1).toBe(mockAIService1);
      expect(service2).toBe(mockAIService2);
      expect(AIService).toHaveBeenCalledTimes(2);
    });

    it('should cast Anthropic client to IAnthropicClient interface', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      const mockAnthropicClient = { messages: { create: jest.fn() } };

      Anthropic.mockImplementation(() => mockAnthropicClient);
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => ({} as AIService));

      createAIService();

      // Verify the client was passed to AIService constructor
      expect(AIService).toHaveBeenCalledWith(
        mockAnthropicClient,
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        undefined
      );
    });

    it('should pass custom partial config without overwriting defaults', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => ({} as AIService));

      const partialConfig = { temperature: 0.7 };

      createAIService(partialConfig);

      expect(AIService).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        partialConfig
      );
    });
  });

  describe('createTestAIService', () => {
    it('should create AIService with provided mocks', () => {
      const mockAnthropicClient = { messages: { create: jest.fn() } };
      const mockKnowledgeBase = { searchProcedures: jest.fn() };
      const mockAuditLogger = { logInteraction: jest.fn() };
      const mockRateLimiter = { checkLimit: jest.fn() };
      const mockConfig = { mode: 'fast' as const, temperature: 0.3 };

      const mockAIService = { id: 'test-service' } as unknown as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      const service = createTestAIService({
        anthropicClient: mockAnthropicClient,
        knowledgeBase: mockKnowledgeBase,
        auditLogger: mockAuditLogger,
        rateLimiter: mockRateLimiter,
        config: mockConfig
      });

      expect(AIService).toHaveBeenCalledWith(
        mockAnthropicClient,
        mockKnowledgeBase,
        mockAuditLogger,
        mockRateLimiter,
        mockConfig
      );
      expect(service).toBe(mockAIService);
    });

    it('should handle partial mocks', () => {
      const mockAnthropicClient = { messages: { create: jest.fn() } };

      const mockAIService = {} as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      const service = createTestAIService({
        anthropicClient: mockAnthropicClient
      });

      expect(AIService).toHaveBeenCalledWith(
        mockAnthropicClient,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(service).toBe(mockAIService);
    });

    it('should handle empty mocks object', () => {
      const mockAIService = {} as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      const service = createTestAIService({});

      expect(AIService).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(service).toBe(mockAIService);
    });

    it('should accept config without other mocks', () => {
      const mockConfig = {
        mode: 'deep' as const,
        quality_threshold: 85,
        temperature: 0.4
      };

      const mockAIService = {} as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      createTestAIService({ config: mockConfig });

      expect(AIService).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        mockConfig
      );
    });

    it('should cast mocks to correct types', () => {
      const mockAnthropicClient = { messages: { create: jest.fn() } };
      const mockKnowledgeBase = { searchProcedures: jest.fn() };
      const mockAuditLogger = { logInteraction: jest.fn() };
      const mockRateLimiter = { checkLimit: jest.fn() };

      const mockAIService = {} as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      createTestAIService({
        anthropicClient: mockAnthropicClient,
        knowledgeBase: mockKnowledgeBase,
        auditLogger: mockAuditLogger,
        rateLimiter: mockRateLimiter
      });

      // Verify mocks were passed correctly (type casting happens in factory)
      expect(AIService).toHaveBeenCalledWith(
        mockAnthropicClient,
        mockKnowledgeBase,
        mockAuditLogger,
        mockRateLimiter,
        undefined
      );
    });

    it('should not require environment variables', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const mockAIService = {} as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      // Should not throw
      expect(() => createTestAIService({})).not.toThrow();
    });

    it('should allow creating multiple test instances independently', () => {
      const mockAIService1 = { id: 'test1' } as unknown as AIService;
      const mockAIService2 = { id: 'test2' } as unknown as AIService;

      (AIService as jest.MockedClass<typeof AIService>)
        .mockImplementationOnce(() => mockAIService1)
        .mockImplementationOnce(() => mockAIService2);

      const service1 = createTestAIService({ anthropicClient: { id: 'client1' } });
      const service2 = createTestAIService({ anthropicClient: { id: 'client2' } });

      expect(service1).toBe(mockAIService1);
      expect(service2).toBe(mockAIService2);
      expect(AIService).toHaveBeenCalledTimes(2);
    });
  });

  describe('Environment Variable Validation Order', () => {
    it('should check Anthropic API key before Supabase variables', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createAIService()).toThrow('ANTHROPIC_API_KEY environment variable is required');
    });

    it('should check Supabase URL and key together', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createAIService()).toThrow('Supabase environment variables are required');
    });

    it('should validate all required variables are present', () => {
      // All required variables set
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => ({} as AIService));

      expect(() => createAIService()).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should return AIService instance', () => {
      const Anthropic = require('@anthropic-ai/sdk');
      const { createClient } = require('@supabase/supabase-js');
      const { KnowledgeBaseService } = require('../rag/knowledge-base-service');
      const { AuditLogger } = require('../audit-logger');
      const { RateLimiter } = require('../rate-limiter');

      Anthropic.mockImplementation(() => ({ messages: { create: jest.fn() } }));
      createClient.mockReturnValue({ from: jest.fn() });
      KnowledgeBaseService.mockImplementation(() => ({}));
      AuditLogger.mockImplementation(() => ({}));
      RateLimiter.mockImplementation(() => ({}));
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => ({} as AIService));

      const service = createAIService();

      // Type assertion should work
      const typedService: AIService = service;
      expect(typedService).toBeDefined();
    });

    it('should return AIService instance from test factory', () => {
      const mockAIService = {} as AIService;
      (AIService as jest.MockedClass<typeof AIService>).mockImplementation(() => mockAIService);

      const service = createTestAIService({});

      // Type assertion should work
      const typedService: AIService = service;
      expect(typedService).toBeDefined();
    });
  });
});
