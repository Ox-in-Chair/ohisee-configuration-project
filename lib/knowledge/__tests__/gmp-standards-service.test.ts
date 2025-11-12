/**
 * GMP Standards Service - Comprehensive Unit Tests
 * TDD Phase: RED → GREEN → REFACTOR → VERIFY
 * Architecture: Mock Supabase client, test GMP compliance checking
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GMPStandardsService, createGMPStandardsService } from '../gmp-standards-service';
import type { SupabaseClient } from '@/lib/database/client';

// Mock Supabase client
class MockSupabaseClient {
  public from = jest.fn(() => this);
  public select = jest.fn(() => this);
  public eq = jest.fn(() => this);
  public or = jest.fn(() => this);
  public limit = jest.fn(() => this);
}

describe('GMPStandardsService - TDD Suite', () => {
  let mockSupabase: MockSupabaseClient;
  let service: GMPStandardsService;

  beforeEach(() => {
    mockSupabase = new MockSupabaseClient();
    service = new GMPStandardsService(mockSupabase as unknown as SupabaseClient);
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should accept SupabaseClient via constructor', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GMPStandardsService);
    });

    it('should create service via factory function without client', () => {
      const factoryService = createGMPStandardsService();
      expect(factoryService).toBeInstanceOf(GMPStandardsService);
    });

    it('should create service via factory function with client', () => {
      const factoryService = createGMPStandardsService(mockSupabase as unknown as SupabaseClient);
      expect(factoryService).toBeInstanceOf(GMPStandardsService);
    });
  });

  describe('searchStandards - GMP Standard Search', () => {
    it('should search GMP standards by query', async () => {
      const mockData = [
        {
          id: '1',
          document_number: 'GMP-HACCP-001',
          document_name: 'HACCP Control Procedures',
          document_type: 'gmp_standard',
          status: 'current',
          brcgs_section: '2.11',
          full_text: 'HACCP procedures text',
          form_sections: ['both'],
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchStandards('HACCP', 'nca');

      expect(mockSupabase.from).toHaveBeenCalledWith('knowledge_base_documents');
      expect(mockSupabase.eq).toHaveBeenCalledWith('document_type', 'gmp_standard');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'current');
      expect(result).toHaveLength(1);
      expect(result[0].document_number).toBe('GMP-HACCP-001');
    });

    it('should filter standards by form type', async () => {
      const mockData = [
        {
          id: '1',
          document_number: 'GMP-001',
          document_name: 'NCA Standard',
          document_type: 'gmp_standard',
          status: 'current',
          full_text: 'Test',
          form_sections: ['nca'],
        },
        {
          id: '2',
          document_number: 'GMP-002',
          document_name: 'MJC Standard',
          document_type: 'gmp_standard',
          status: 'current',
          full_text: 'Test',
          form_sections: ['mjc'],
        },
        {
          id: '3',
          document_number: 'GMP-003',
          document_name: 'Both Standard',
          document_type: 'gmp_standard',
          status: 'current',
          full_text: 'Test',
          form_sections: ['both'],
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const ncaResult = await service.searchStandards('test', 'nca');
      expect(ncaResult.some(s => s.document_number === 'GMP-001')).toBe(true);
      expect(ncaResult.some(s => s.document_number === 'GMP-003')).toBe(true);

      const mjcResult = await service.searchStandards('test', 'mjc');
      expect(mjcResult.some(s => s.document_number === 'GMP-002')).toBe(true);
      expect(mjcResult.some(s => s.document_number === 'GMP-003')).toBe(true);
    });

    it('should default to NCA form type', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await service.searchStandards('test');

      expect(mockSupabase.from).toHaveBeenCalledWith('knowledge_base_documents');
    });

    it('should limit results to 20 standards', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await service.searchStandards('test', 'nca');

      expect(mockSupabase.limit).toHaveBeenCalledWith(20);
    });

    it('should return empty array on database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await service.searchStandards('test');

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle null data gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: null });

      const result = await service.searchStandards('test');

      expect(result).toEqual([]);
    });

    it('should map database records to GMPStandard structure', async () => {
      const mockData = [
        {
          id: 'abc-123',
          document_number: 'GMP-TEST-001',
          document_name: 'Test Standard',
          brcgs_section: '2.11',
          full_text: 'Full standard text',
          form_sections: ['nca'],
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchStandards('test', 'nca');

      expect(result[0]).toEqual({
        id: 'abc-123',
        document_number: 'GMP-TEST-001',
        document_name: 'Test Standard',
        gmp_section: '2.11',
        content: 'Full standard text',
        applicable_to: ['nca'],
        brcgs_reference: '2.11',
      });
    });
  });

  describe('getStandardsBySection - Section-Based Retrieval', () => {
    it('should retrieve standards by BRCGS section', async () => {
      const mockData = [
        {
          id: '1',
          document_number: 'GMP-HACCP-001',
          document_name: 'HACCP Standard',
          brcgs_section: '2.11',
          full_text: 'HACCP text',
          document_type: 'gmp_standard',
          status: 'current',
        },
      ];

      mockSupabase.or.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getStandardsBySection('HACCP');

      expect(mockSupabase.eq).toHaveBeenCalledWith('document_type', 'gmp_standard');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'current');
      expect(result).toHaveLength(1);
    });

    it('should search in both section and name fields', async () => {
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      await service.getStandardsBySection('Allergen');

      expect(mockSupabase.or).toHaveBeenCalled();
    });

    it('should return empty array on database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.or.mockResolvedValue({
        data: null,
        error: new Error('Query failed'),
      });

      const result = await service.getStandardsBySection('test');

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('checkCompliance - GMP Compliance Verification', () => {
    it('should detect allergen mentions and generate violations', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [
          {
            id: '1',
            document_number: 'GMP-ALLERGEN-001',
            document_name: 'Allergen Management',
            full_text: 'Allergen control procedures',
          },
        ],
        error: null,
      });

      const formData = {
        nc_description: 'Found peanut allergen contamination in product',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].violation_type).toBe('allergen');
      expect(result.violations[0].severity).toBe('high');
      expect(result.complianceScore).toBeLessThan(100);
    });

    it('should detect HACCP-related issues', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [
          {
            id: '1',
            document_number: 'GMP-HACCP-001',
            document_name: 'HACCP Control',
            full_text: 'HACCP procedures',
          },
        ],
        error: null,
      });

      const formData = {
        nc_description: 'Critical control point failure detected with contamination hazard',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].violation_type).toBe('haccp');
      expect(result.violations[0].severity).toBe('medium');
    });

    it('should handle both NC and MJC descriptions', async () => {
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const mjcData = {
        description_required: 'Machine hygiene issue with allergen risk',
      };

      const result = await service.checkCompliance(mjcData, 'mjc');

      expect(result).toBeDefined();
    });

    it('should return 100% compliance when no violations', async () => {
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const formData = {
        nc_description: 'Minor packaging defect - no safety impact',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.complianceScore).toBe(100);
      expect(result.violations).toHaveLength(0);
    });

    it('should calculate compliance score based on violations', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [{ id: '1', document_number: 'GMP-001', document_name: 'Test', full_text: 'Test' }],
        error: null,
      });

      const formData = {
        nc_description: 'allergen peanut gluten dairy contamination hazard',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore).toBeLessThan(100);
      expect(result.complianceScore).toBe(Math.max(0, 100 - result.violations.length * 20));
    });

    it('should generate recommendations when violations exist', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [{ id: '1', document_number: 'GMP-001', document_name: 'Test', full_text: 'Test' }],
        error: null,
      });

      const formData = {
        nc_description: 'allergen contamination',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('GMP'))).toBe(true);
    });

    it('should generate positive recommendations when no violations', async () => {
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const formData = {
        nc_description: 'Simple issue',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.recommendations).toContain('No GMP violations detected. Continue following GMP protocols.');
    });

    it('should handle empty descriptions gracefully', async () => {
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const result = await service.checkCompliance({}, 'nca');

      expect(result.complianceScore).toBe(100);
      expect(result.violations).toHaveLength(0);
    });

    it('should be case-insensitive for keyword detection', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [{ id: '1', document_number: 'GMP-001', document_name: 'Test', full_text: 'Test' }],
        error: null,
      });

      const formData = {
        nc_description: 'ALLERGEN and HAZARD detected in CRITICAL control point',
      };

      const result = await service.checkCompliance(formData, 'nca');

      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('getHACCPRootCauseSuggestions - HACCP Guidance', () => {
    it('should return HACCP-based suggestions', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [
          {
            id: '1',
            document_number: 'GMP-HACCP-001',
            document_name: 'HACCP Standard',
            full_text: 'HACCP text',
          },
        ],
        error: null,
      });

      const result = await service.getHACCPRootCauseSuggestions('Current analysis');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(s => s.includes('HACCP'))).toBe(true);
    });

    it('should return fallback suggestions when no HACCP standards found', async () => {
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const result = await service.getHACCPRootCauseSuggestions('Analysis');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('HACCP principles');
    });

    it('should include 5-Why method suggestion', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [{ id: '1', document_number: 'GMP-001', document_name: 'Test', full_text: 'Test' }],
        error: null,
      });

      const result = await service.getHACCPRootCauseSuggestions('Test');

      expect(result.some(s => s.includes('5-Why'))).toBe(true);
    });

    it('should include CCP identification suggestion', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [{ id: '1', document_number: 'GMP-001', document_name: 'Test', full_text: 'Test' }],
        error: null,
      });

      const result = await service.getHACCPRootCauseSuggestions('Test');

      expect(result.some(s => s.includes('Critical Control Point'))).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete searchStandards within 1 second', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `${i}`,
          document_number: `GMP-${i}`,
          document_name: `Standard ${i}`,
          full_text: 'Text',
        })),
        error: null,
      });

      const startTime = Date.now();
      await service.searchStandards('test', 'nca');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should complete checkCompliance within 2 seconds', async () => {
      mockSupabase.or.mockResolvedValue({
        data: [{ id: '1', document_number: 'GMP-001', document_name: 'Test', full_text: 'Test' }],
        error: null,
      });

      const formData = {
        nc_description: 'allergen contamination hazard at critical control point',
      };

      const startTime = Date.now();
      await service.checkCompliance(formData, 'nca');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Data Mapping', () => {
    it('should handle missing form_sections field', async () => {
      const mockData = [
        {
          id: '1',
          document_number: 'GMP-001',
          document_name: 'Test Standard',
          full_text: 'Text',
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchStandards('test', 'nca');

      expect(result[0].applicable_to).toEqual(['both']);
    });

    it('should handle missing brcgs_section field', async () => {
      const mockData = [
        {
          id: '1',
          document_number: 'GMP-001',
          document_name: 'Test',
          full_text: 'Text',
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchStandards('test', 'nca');

      expect(result[0].gmp_section).toBeUndefined();
      expect(result[0].brcgs_reference).toBeUndefined();
    });

    it('should preserve all standard fields', async () => {
      const mockData = [
        {
          id: 'test-id',
          document_number: 'GMP-TEST-001',
          document_name: 'Complete Standard',
          brcgs_section: '2.11',
          full_text: 'Full text content',
          form_sections: ['both'],
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchStandards('test', 'nca');

      expect(result[0]).toMatchObject({
        id: 'test-id',
        document_number: 'GMP-TEST-001',
        document_name: 'Complete Standard',
        gmp_section: '2.11',
        content: 'Full text content',
        applicable_to: ['both'],
        brcgs_reference: '2.11',
      });
    });
  });
});
