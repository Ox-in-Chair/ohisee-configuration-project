/**
 * Knowledge Base Service - Comprehensive Unit Tests
 * TDD Phase: RED → GREEN → REFACTOR → VERIFY
 * Architecture: Mock Supabase client, verify DI pattern, test all retrieval logic
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { KnowledgeBaseService } from '../knowledge-base-service';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
class MockSupabaseClient {
  public from = jest.fn(() => this);
  public select = jest.fn(() => this);
  public eq = jest.fn(() => this);
  public single = jest.fn(() => this);
  public rpc = jest.fn(() => this);
}

describe('KnowledgeBaseService - TDD Suite', () => {
  let mockSupabase: MockSupabaseClient;
  let service: KnowledgeBaseService;

  beforeEach(() => {
    mockSupabase = new MockSupabaseClient();
    service = new KnowledgeBaseService(mockSupabase as unknown as SupabaseClient);
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should accept SupabaseClient via constructor (no static calls)', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(KnowledgeBaseService);
    });

    it('should use injected client for database operations', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.searchProcedures('test query');

      expect(mockSupabase.rpc).toHaveBeenCalled();
    });
  });

  describe('searchProcedures - Vector Similarity Search', () => {
    it('should search procedures using vector embeddings', async () => {
      const mockData = [
        {
          procedure_number: '5.7',
          content: 'Control of Non-Conforming Product',
          similarity: 0.92,
        },
        {
          procedure_number: '3.11',
          content: 'Corrective and Preventive Action',
          similarity: 0.85,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchProcedures('non-conforming product', 5);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_procedures', {
        query_embedding: expect.any(Array),
        match_limit: 5,
        match_threshold: 0.5,
      });
      expect(result).toHaveLength(2);
      expect(result[0].procedure_number).toBe('5.7');
      expect(result[0].relevance).toBe(0.92);
    });

    it('should limit results to specified count', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        procedure_number: `${i + 1}.0`,
        content: `Procedure ${i + 1}`,
        similarity: 0.9 - i * 0.05,
      }));

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchProcedures('test', 3);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_procedures', {
        query_embedding: expect.any(Array),
        match_limit: 3,
        match_threshold: 0.5,
      });
    });

    it('should default to 5 results when limit not specified', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.searchProcedures('test query');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_procedures', {
        query_embedding: expect.any(Array),
        match_limit: 5,
        match_threshold: 0.5,
      });
    });

    it('should return fallback procedures on database error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await service.searchProcedures('raw material');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('procedure_number');
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('relevance');
    });

    it('should return fallback procedures on exception', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'));

      const result = await service.searchProcedures('contamination');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array gracefully when no data available', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await service.searchProcedures('unknown query');

      expect(result).toEqual([]);
    });

    it('should map database results to correct structure', async () => {
      const mockData = [
        {
          procedure_number: '5.8',
          content: 'Foreign Body Contamination Control',
          similarity: 0.88,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchProcedures('foreign body');

      expect(result[0]).toEqual({
        procedure_number: '5.8',
        content: 'Foreign Body Contamination Control',
        relevance: 0.88,
      });
    });
  });

  describe('findSimilarCases - Historical Case Retrieval', () => {
    it('should search NCA cases using vector embeddings', async () => {
      const mockData = [
        {
          id: 'nca-123',
          description: 'Packaging defect - torn pouches',
          corrective_action: 'Replaced worn sealing blade',
          similarity: 0.91,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await service.findSimilarCases('torn packaging', 'nca', 3);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_similar_cases', {
        query_embedding: expect.any(Array),
        case_type: 'nca',
        match_limit: 3,
        match_threshold: 0.6,
        min_quality_score: 75,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nca-123');
      expect(result[0].similarity).toBe(0.91);
    });

    it('should search MJC cases using vector embeddings', async () => {
      const mockData = [
        {
          id: 'mjc-456',
          description: 'Machine vibration issue',
          corrective_action: 'Replaced motor bearings',
          similarity: 0.87,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await service.findSimilarCases('motor vibration', 'mjc', 3);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_similar_cases', {
        query_embedding: expect.any(Array),
        case_type: 'mjc',
        match_limit: 3,
        match_threshold: 0.6,
        min_quality_score: 75,
      });
    });

    it('should default to 3 results when limit not specified', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.findSimilarCases('test description', 'nca');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_similar_cases', {
        query_embedding: expect.any(Array),
        case_type: 'nca',
        match_limit: 3,
        match_threshold: 0.6,
        min_quality_score: 75,
      });
    });

    it('should filter cases by minimum quality score', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.findSimilarCases('test', 'nca', 5);

      const callArgs = (mockSupabase.rpc as jest.Mock).mock.calls[0][1];
      expect(callArgs.min_quality_score).toBe(75);
    });

    it('should return empty array on database error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Query timeout')
      });

      const result = await service.findSimilarCases('test', 'nca');

      expect(result).toEqual([]);
    });

    it('should return empty array on exception', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Connection lost'));

      const result = await service.findSimilarCases('test', 'mjc');

      expect(result).toEqual([]);
    });

    it('should map results to correct structure', async () => {
      const mockData = [
        {
          id: 'case-789',
          description: 'Contamination event',
          corrective_action: 'Enhanced hygiene protocols',
          similarity: 0.93,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await service.findSimilarCases('contamination', 'nca');

      expect(result[0]).toEqual({
        id: 'case-789',
        description: 'Contamination event',
        action: 'Enhanced hygiene protocols',
        similarity: 0.93,
      });
    });

    it('should handle empty description gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await service.findSimilarCases('', 'nca');

      expect(result).toEqual([]);
      expect(mockSupabase.rpc).toHaveBeenCalled();
    });
  });

  describe('getProcedure - Single Procedure Retrieval', () => {
    it('should retrieve procedure by number', async () => {
      const mockData = {
        title: 'Control of Non-Conforming Product',
        content: 'Full procedure text...',
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getProcedure('5.7');

      expect(mockSupabase.from).toHaveBeenCalledWith('brcgs_procedures');
      expect(mockSupabase.select).toHaveBeenCalledWith('title, content');
      expect(mockSupabase.eq).toHaveBeenCalledWith('procedure_number', '5.7');
      expect(result).toEqual(mockData);
    });

    it('should return fallback content on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Not found')
      });

      const result = await service.getProcedure('5.7');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result?.title).toBe('Control of Non-Conforming Product');
    });

    it('should return fallback content for known procedure numbers', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const knownProcedures = ['5.7', '3.11', '3.9', '5.8', '4.7', '5.6'];

      for (const procNumber of knownProcedures) {
        const result = await service.getProcedure(procNumber);
        expect(result).toBeDefined();
        expect(result?.title).toBeTruthy();
        expect(result?.content).toBeTruthy();
      }
    });

    it('should return null for unknown procedure numbers', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.getProcedure('99.99');

      expect(result).toBeNull();
    });

    it('should return fallback on exception', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database unavailable'));

      const result = await service.getProcedure('5.8');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Foreign Body Contamination Control');
    });
  });

  describe('Fallback Procedures - Keyword Matching', () => {
    it('should return raw material procedures for material keywords', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('raw material quality issue');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.procedure_number === '5.7')).toBe(true);
      expect(result.some(p => p.procedure_number === '3.4')).toBe(true);
    });

    it('should return finished goods procedures for product keywords', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('finished goods quality');

      expect(result.some(p => p.procedure_number === '5.7')).toBe(true);
    });

    it('should return contamination procedures for foreign body keywords', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('glass contamination detected');

      expect(result.some(p => p.procedure_number === '5.8')).toBe(true);
    });

    it('should return maintenance procedures for equipment keywords', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('machine breakdown repair');

      expect(result.some(p => p.procedure_number === '4.7')).toBe(true);
    });

    it('should return calibration procedures for measuring keywords', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('scale calibration required');

      expect(result.some(p => p.procedure_number === '5.6')).toBe(true);
    });

    it('should return traceability procedures for batch tracking keywords', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('batch traceability verification');

      expect(result.some(p => p.procedure_number === '3.9')).toBe(true);
    });

    it('should return default procedures when no keywords match', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('something completely unrelated');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.procedure_number === '5.7')).toBe(true);
    });

    it('should limit fallback procedures to 5 results', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('test query');

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should assign relevance scores to fallback procedures', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      const result = await service.searchProcedures('contamination foreign body');

      expect(result.every(p => typeof p.relevance === 'number')).toBe(true);
      expect(result.every(p => p.relevance >= 0 && p.relevance <= 1)).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete searchProcedures within 2 seconds', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: Array.from({ length: 5 }, () => ({
          procedure_number: '5.7',
          content: 'Test content',
          similarity: 0.9,
        })),
        error: null
      });

      const startTime = Date.now();
      await service.searchProcedures('test query');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should complete findSimilarCases within 2 seconds', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: Array.from({ length: 3 }, () => ({
          id: 'case-1',
          description: 'Test case',
          corrective_action: 'Test action',
          similarity: 0.85,
        })),
        error: null
      });

      const startTime = Date.now();
      await service.findSimilarCases('test description', 'nca');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should complete getProcedure within 1 second', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { title: 'Test', content: 'Test content' },
        error: null
      });

      const startTime = Date.now();
      await service.getProcedure('5.7');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Handling & Logging', () => {
    it('should log errors on searchProcedures failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.rpc.mockRejectedValue(new Error('Database error'));

      await service.searchProcedures('test');

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Knowledge base search failed'),
        expect.any(Error)
      );
      consoleError.mockRestore();
    });

    it('should log errors on findSimilarCases failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.rpc.mockRejectedValue(new Error('Query timeout'));

      await service.findSimilarCases('test', 'nca');

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Similar cases search failed'),
        expect.any(Error)
      );
      consoleError.mockRestore();
    });

    it('should log errors on getProcedure failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.single.mockRejectedValue(new Error('Connection lost'));

      await service.getProcedure('5.7');

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching procedure 5.7'),
        expect.any(Error)
      );
      consoleError.mockRestore();
    });
  });

  describe('Readonly Return Types', () => {
    it('should return readonly array from searchProcedures', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await service.searchProcedures('test');

      expect(Array.isArray(result)).toBe(true);
      // TypeScript enforces readonly at compile time
    });

    it('should return readonly array from findSimilarCases', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await service.findSimilarCases('test', 'nca');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
