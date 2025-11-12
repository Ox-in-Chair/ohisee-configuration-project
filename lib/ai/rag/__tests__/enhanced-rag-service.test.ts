/**
 * Enhanced RAG Service - Comprehensive Unit Tests
 * TDD Phase: RED → GREEN → REFACTOR → VERIFY
 * Architecture: Mock all dependencies, test context retrieval and prompt generation
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EnhancedRAGService } from '../enhanced-rag-service';
import type { NCA, MJC } from '../../types';

// Mock createServerClient
jest.mock('@/lib/database/client', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

// Mock knowledge services
jest.mock('@/lib/knowledge/packaging-safety-service', () => ({
  createPackagingSafetyService: jest.fn(() => mockPackagingService),
}));

jest.mock('@/lib/knowledge/gmp-standards-service', () => ({
  createGMPStandardsService: jest.fn(() => mockGMPService),
}));

// Global mocks
let mockSupabaseClient: any;
let mockPackagingService: any;
let mockGMPService: any;

describe('EnhancedRAGService - TDD Suite', () => {
  let service: EnhancedRAGService;

  beforeEach(() => {
    // Reset mocks
    mockSupabaseClient = {
      from: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      eq: jest.fn(() => mockSupabaseClient),
      textSearch: jest.fn(() => mockSupabaseClient),
      limit: jest.fn(() => mockSupabaseClient),
      single: jest.fn(() => ({ data: null, error: null })),
    };

    mockPackagingService = {
      searchMaterials: jest.fn().mockResolvedValue([]),
      getSafetySuggestions: jest.fn().mockResolvedValue(null),
      getBRCGSSection: jest.fn().mockReturnValue('5.8'),
    };

    mockGMPService = {
      checkCompliance: jest.fn().mockResolvedValue({
        violations: [],
        recommendations: [],
        complianceScore: 100,
      }),
    };

    service = new EnhancedRAGService();
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should create service without static dependencies', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EnhancedRAGService);
    });

    it('should use createServerClient for database access', () => {
      const { createServerClient } = require('@/lib/database/client');
      expect(createServerClient).toBeDefined();
    });
  });

  describe('retrieveContext - Full Context Retrieval', () => {
    it('should retrieve procedures, similar cases, and policy version', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({
          data: [
            {
              document_number: '5.7',
              full_text: 'Control of Non-Conforming Product',
              brcgs_section: '5.7',
            },
          ],
          error: null,
        })),
      });

      mockSupabaseClient.limit.mockResolvedValue({
        data: [
          {
            id: 'nca-123',
            nc_description: 'Test NC',
            corrective_action: 'Test action',
          },
        ],
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: { version: '2.1.0' },
        error: null,
      });

      const result = await service.retrieveContext('test query', 'nca');

      expect(result).toBeDefined();
      expect(result.procedures).toBeDefined();
      expect(result.similarCases).toBeDefined();
      expect(result.policyVersion).toBe('2.1.0');
      expect(result.retrievedAt).toBeInstanceOf(Date);
    });

    it('should handle NCA form type correctly', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const ncaData: Partial<NCA> = {
        nc_description: 'Packaging defect',
        wo_id: 'wo-123',
      };

      const result = await service.retrieveContext('packaging', 'nca', ncaData);

      expect(result.procedures).toEqual([]);
      expect(result.similarCases).toEqual([]);
    });

    it('should handle MJC form type correctly', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const mjcData: Partial<MJC> = {
        description_required: 'Machine malfunction',
        machine_id: 'machine-456',
      };

      const result = await service.retrieveContext('machine', 'mjc', mjcData);

      expect(result).toBeDefined();
    });

    it('should return default policy version on database error', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      });

      const result = await service.retrieveContext('test', 'nca');

      expect(result.policyVersion).toBe('1.0.0');
    });

    it('should handle empty query string gracefully', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.retrieveContext('', 'nca');

      expect(result).toBeDefined();
      expect(result.procedures).toEqual([]);
    });
  });

  describe('searchProcedures - Text Search', () => {
    it('should search procedures using full-text search', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({
          data: [
            {
              document_number: '5.7',
              full_text: 'Non-conforming product procedure',
              brcgs_section: '5.7',
            },
          ],
          error: null,
        })),
      });

      const result = await service.retrieveContext('non-conforming', 'nca');

      expect(result.procedures).toHaveLength(1);
      expect(result.procedures[0].procedure_number).toBe('5.7');
    });

    it('should filter procedures by current status', async () => {
      const limitMock = jest.fn(() => ({ data: [], error: null }));
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: limitMock,
      });

      await service.retrieveContext('test', 'nca');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'current');
    });

    it('should limit procedures to 5 results', async () => {
      const limitMock = jest.fn(() => ({ data: [], error: null }));
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: limitMock,
      });

      await service.retrieveContext('test', 'nca');

      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('should truncate long procedure content', async () => {
      const longContent = 'a'.repeat(1000);
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({
          data: [
            {
              document_number: '5.7',
              full_text: longContent,
              brcgs_section: '5.7',
            },
          ],
          error: null,
        })),
      });

      const result = await service.retrieveContext('test', 'nca');

      expect(result.procedures[0].content.length).toBeLessThanOrEqual(503); // 500 + '...'
    });

    it('should assign relevance scores based on order', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({
          data: [
            { document_number: '1', full_text: 'First', brcgs_section: '1' },
            { document_number: '2', full_text: 'Second', brcgs_section: '2' },
            { document_number: '3', full_text: 'Third', brcgs_section: '3' },
          ],
          error: null,
        })),
      });

      const result = await service.retrieveContext('test', 'nca');

      expect(result.procedures[0].relevance).toBe(1.0);
      expect(result.procedures[1].relevance).toBe(0.9);
      expect(result.procedures[2].relevance).toBe(0.8);
    });

    it('should return empty array on database error', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: null, error: new Error('DB error') })),
      });

      const result = await service.retrieveContext('test', 'nca');

      expect(result.procedures).toEqual([]);
    });
  });

  describe('findSimilarCases - Historical Case Search', () => {
    it('should search NCA records for similar cases', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });

      mockSupabaseClient.limit.mockResolvedValue({
        data: [
          {
            id: 'nca-1',
            nc_description: 'Similar NC',
            corrective_action: 'Action taken',
          },
        ],
        error: null,
      });

      const result = await service.retrieveContext('test', 'nca');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('nca_records');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'closed');
    });

    it('should search MJC records for similar cases', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });

      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.retrieveContext('test', 'mjc');

      expect(result.similarCases).toBeDefined();
    });

    it('should return empty array on database error', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });

      mockSupabaseClient.limit.mockResolvedValue({
        data: null,
        error: new Error('Query failed'),
      });

      const result = await service.retrieveContext('test', 'nca');

      expect(result.similarCases).toEqual([]);
    });
  });

  describe('generateSuggestionWithRAG - Full RAG Pipeline', () => {
    it('should generate suggestion with all context sources', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const ncaData: Partial<NCA> = {
        nc_description: 'Test NC',
        wo_id: 'wo-123',
      };

      const result = await service.generateSuggestionWithRAG(
        'nc_description',
        'Current text',
        ncaData,
        'nca'
      );

      expect(result).toHaveProperty('suggestion');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('confidence');
      expect(Array.isArray(result.sources)).toBe(true);
      expect(typeof result.confidence).toBe('number');
    });

    it('should generate suggestions with packaging context field', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const ncaData: Partial<NCA> = {
        nc_product_description: 'Test product with sufficient length',
      };

      const result = await service.generateSuggestionWithRAG(
        'nc_product_description',
        'Current value',
        ncaData,
        'nca'
      );

      // Verify suggestion generated
      expect(result).toBeDefined();
      expect(result.suggestion).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.confidence).toBe(0.85);
    });

    it('should generate suggestions with GMP context', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const ncaData: Partial<NCA> = {
        nc_description: 'Test NC with violations',
      };

      const result = await service.generateSuggestionWithRAG(
        'nc_description',
        'Test value',
        ncaData,
        'nca'
      );

      // Verify suggestion generated
      expect(result).toBeDefined();
      expect(result.suggestion).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.confidence).toBe(0.85);
    });

    it('should handle fine-tuning config', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const config = {
        enabled: true,
        modelId: 'custom-model-123',
        temperature: 0.7,
        maxTokens: 500,
      };

      const result = await service.generateSuggestionWithRAG(
        'corrective_action',
        'Test',
        {},
        'nca',
        config
      );

      expect(result).toBeDefined();
    });

    it('should return confidence score', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.generateSuggestionWithRAG(
        'nc_description',
        'Test',
        {},
        'nca'
      );

      expect(result.confidence).toBe(0.85);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('buildRAGPrompt - Prompt Generation', () => {
    it('should generate field-specific prompts for nc_description', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.generateSuggestionWithRAG(
        'nc_description',
        'Test NC',
        {},
        'nca'
      );

      expect(result.suggestion).toContain('Generated suggestion');
    });

    it('should generate field-specific prompts for root_cause_analysis', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.generateSuggestionWithRAG(
        'root_cause_analysis',
        'Test RCA',
        {},
        'nca'
      );

      expect(result).toBeDefined();
    });

    it('should generate field-specific prompts for corrective_action', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.generateSuggestionWithRAG(
        'corrective_action',
        'Test CA',
        {},
        'nca'
      );

      expect(result).toBeDefined();
    });

    it('should generate field-specific prompts for MJC description', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.generateSuggestionWithRAG(
        'description_required',
        'Test MJC',
        {},
        'mjc'
      );

      expect(result).toBeDefined();
    });

    it('should handle unknown fields with generic instructions', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.generateSuggestionWithRAG(
        'unknown_field',
        'Test',
        {},
        'nca'
      );

      expect(result).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete retrieveContext within 2 seconds', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const startTime = Date.now();
      await service.retrieveContext('test', 'nca');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should complete generateSuggestionWithRAG within 5 seconds', async () => {
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });

      const startTime = Date.now();
      await service.generateSuggestionWithRAG('nc_description', 'Test', {}, 'nca');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling & Logging', () => {
    it('should log errors on procedure search failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabaseClient.textSearch.mockImplementation(() => {
        throw new Error('Database crash');
      });

      await service.retrieveContext('test', 'nca');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should log errors on similar case search failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockImplementation(() => {
        throw new Error('Query timeout');
      });

      await service.retrieveContext('test', 'nca');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should log errors on policy version retrieval failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabaseClient.textSearch.mockReturnValue({
        ...mockSupabaseClient,
        limit: jest.fn(() => ({ data: [], error: null })),
      });
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null });
      mockSupabaseClient.single.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      await service.retrieveContext('test', 'nca');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
