/**
 * Packaging Safety Service - Comprehensive Unit Tests
 * TDD Phase: RED → GREEN → REFACTOR → VERIFY
 * Architecture: Mock Supabase client, test packaging material retrieval and safety checks
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PackagingSafetyService, createPackagingSafetyService } from '../packaging-safety-service';
import type { SupabaseClient } from '@/lib/database/client';

// Mock Supabase client
class MockSupabaseClient {
  public from = jest.fn(() => this);
  public select = jest.fn(() => this);
  public eq = jest.fn(() => this);
  public or = jest.fn(() => this);
  public limit = jest.fn(() => this);
  public single = jest.fn(() => this);
}

describe('PackagingSafetyService - TDD Suite', () => {
  let mockSupabase: MockSupabaseClient;
  let service: PackagingSafetyService;

  beforeEach(() => {
    mockSupabase = new MockSupabaseClient();
    service = new PackagingSafetyService(mockSupabase as unknown as SupabaseClient);
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should accept SupabaseClient via constructor', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PackagingSafetyService);
    });

    it('should create service via factory function without client', () => {
      const factoryService = createPackagingSafetyService();
      expect(factoryService).toBeInstanceOf(PackagingSafetyService);
    });

    it('should create service via factory function with client', () => {
      const factoryService = createPackagingSafetyService(mockSupabase as unknown as SupabaseClient);
      expect(factoryService).toBeInstanceOf(PackagingSafetyService);
    });
  });

  describe('searchMaterials - Material Search', () => {
    it('should search materials by code', async () => {
      const mockData = [
        {
          id: 'mat-1',
          material_code: 'PKG-001',
          material_name: 'PET Film',
          material_type: 'film',
          active: true,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchMaterials('PKG-001');

      expect(mockSupabase.from).toHaveBeenCalledWith('packaging_materials');
      expect(mockSupabase.eq).toHaveBeenCalledWith('active', true);
      expect(result).toHaveLength(1);
      expect(result[0].material_code).toBe('PKG-001');
    });

    it('should search materials by name', async () => {
      const mockData = [
        {
          id: 'mat-2',
          material_code: 'PKG-002',
          material_name: 'Aluminum Foil',
          material_type: 'laminate',
          active: true,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchMaterials('Aluminum');

      expect(result).toHaveLength(1);
      expect(result[0].material_name).toContain('Aluminum');
    });

    it('should limit results to 10 materials', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await service.searchMaterials('test');

      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it('should only return active materials', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await service.searchMaterials('test');

      expect(mockSupabase.eq).toHaveBeenCalledWith('active', true);
    });

    it('should return empty array on database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await service.searchMaterials('test');

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle null data gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: null });

      const result = await service.searchMaterials('test');

      expect(result).toEqual([]);
    });

    it('should map database records to PackagingMaterial structure', async () => {
      const mockData = [
        {
          id: 'test-id',
          material_code: 'PKG-TEST',
          material_name: 'Test Material',
          material_type: 'pouch',
          specifications: { thickness: '50 micron' },
          safety_data: { food_contact_approved: true },
          supplier_certifications: ['ISO 9001', 'BRC'],
          migration_limits: [
            {
              substance: 'Lead',
              limit_ppm: 0.5,
              test_method: 'ICP-MS',
            },
          ],
          compatibility_matrix: {
            compatible_with: ['water', 'oil'],
            incompatible_with: ['alcohol'],
          },
          brcgs_section: '5.8',
          active: true,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchMaterials('test');

      expect(result[0]).toMatchObject({
        id: 'test-id',
        material_code: 'PKG-TEST',
        material_name: 'Test Material',
        material_type: 'pouch',
        specifications: { thickness: '50 micron' },
        safety_data: { food_contact_approved: true },
        supplier_certifications: ['ISO 9001', 'BRC'],
        migration_limits: expect.arrayContaining([
          expect.objectContaining({
            substance: 'Lead',
            limit_ppm: 0.5,
            test_method: 'ICP-MS',
          }),
        ]),
        compatibility_matrix: {
          compatible_with: ['water', 'oil'],
          incompatible_with: ['alcohol'],
        },
        brcgs_section: '5.8',
        active: true,
      });
    });
  });

  describe('getMaterialByCode - Single Material Retrieval', () => {
    it('should retrieve material by exact code match', async () => {
      const mockData = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'PET Film',
        material_type: 'film',
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getMaterialByCode('PKG-001');

      expect(mockSupabase.from).toHaveBeenCalledWith('packaging_materials');
      expect(mockSupabase.eq).toHaveBeenCalledWith('material_code', 'PKG-001');
      expect(mockSupabase.eq).toHaveBeenCalledWith('active', true);
      expect(result).toBeDefined();
      expect(result?.material_code).toBe('PKG-001');
    });

    it('should return null on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const result = await service.getMaterialByCode('INVALID');

      expect(result).toBeNull();
    });

    it('should return null when no data found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.getMaterialByCode('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should map database record correctly', async () => {
      const mockData = {
        id: 'mat-1',
        material_code: 'PKG-FULL',
        material_name: 'Full Material',
        material_type: 'laminate',
        specifications: { width: '1000mm', barrier_properties: 'high' },
        safety_data: { food_contact_approved: true },
        supplier_certifications: ['FDA'],
        migration_limits: [],
        compatibility_matrix: {},
        brcgs_section: '5.8',
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getMaterialByCode('PKG-FULL');

      expect(result).toMatchObject(mockData);
    });
  });

  describe('getSafetySuggestions - Safety Analysis', () => {
    it('should generate safety suggestions for material', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'film' as const,
        migration_limits: [
          {
            substance: 'Lead',
            limit_ppm: 0.5,
            test_method: 'ICP-MS',
          },
        ],
        safety_data: { food_contact_approved: true },
        brcgs_section: '5.8',
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'Packaging defect');

      expect(result).toBeDefined();
      expect(result?.material).toBeDefined();
      expect(result?.safetyWarnings).toBeDefined();
      expect(result?.complianceNotes).toBeDefined();
      expect(result?.correctiveActions).toBeDefined();
    });

    it('should return null when material not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.getSafetySuggestions('INVALID', 'description');

      expect(result).toBeNull();
    });

    it('should note migration limits in compliance notes', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'film' as const,
        migration_limits: [
          { substance: 'Lead', limit_ppm: 0.5, test_method: 'ICP-MS' },
          { substance: 'Cadmium', limit_ppm: 0.1, test_method: 'AAS' },
        ],
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'test');

      expect(result?.complianceNotes.length).toBeGreaterThan(0);
      expect(result?.complianceNotes[0]).toContain('2 migration limit');
      expect(result?.complianceNotes[0]).toContain('BRCGS 5.8');
    });

    it('should warn when material not food contact approved', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Non-Food Material',
        material_type: 'other' as const,
        safety_data: { food_contact_approved: false },
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'test');

      expect(result?.safetyWarnings.length).toBeGreaterThan(0);
      expect(result?.safetyWarnings[0]).toContain('not approved for direct food contact');
      expect(result?.safetyWarnings[0]).toContain('BRCGS Section 5.8');
    });

    it('should warn about material incompatibilities', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'laminate' as const,
        compatibility_matrix: {
          incompatible_with: ['alcohol', 'acid'],
        },
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'test');

      expect(result?.safetyWarnings.some(w => w.includes('incompatibilities'))).toBe(true);
    });

    it('should include BRCGS section in corrective actions', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'pouch' as const,
        brcgs_section: '5.8',
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'test');

      expect(result?.correctiveActions.length).toBeGreaterThan(0);
      expect(result?.correctiveActions[0]).toContain('BRCGS 5.8');
    });

    it('should handle materials with no safety issues', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Safe Material',
        material_type: 'film' as const,
        safety_data: { food_contact_approved: true },
        brcgs_section: '5.8',
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'test');

      expect(result?.safetyWarnings).toHaveLength(0);
    });

    it('should default BRCGS section to 5.8 when missing', async () => {
      const mockMaterial = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'reel' as const,
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockMaterial, error: null });

      const result = await service.getSafetySuggestions('PKG-001', 'test');

      expect(result?.correctiveActions[0]).toContain('BRCGS 5.8');
    });
  });

  describe('getBRCGSSection - BRCGS Reference', () => {
    it('should return BRCGS section 5.8', () => {
      const section = service.getBRCGSSection();

      expect(section).toBe('5.8');
    });
  });

  describe('Data Mapping - Edge Cases', () => {
    it('should handle missing optional fields', async () => {
      const mockData = [
        {
          id: 'mat-1',
          material_code: 'PKG-MINIMAL',
          material_name: 'Minimal Material',
          material_type: 'other',
          active: true,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchMaterials('minimal');

      expect(result[0].specifications).toEqual({});
      expect(result[0].safety_data).toEqual({});
      expect(result[0].supplier_certifications).toEqual([]);
      expect(result[0].migration_limits).toEqual([]);
      expect(result[0].compatibility_matrix).toEqual({});
    });

    it('should default BRCGS section to 5.8 when missing', async () => {
      const mockData = [
        {
          id: 'mat-1',
          material_code: 'PKG-001',
          material_name: 'Test',
          material_type: 'film',
          active: true,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchMaterials('test');

      expect(result[0].brcgs_section).toBe('5.8');
    });

    it('should default active to true when missing', async () => {
      const mockData = [
        {
          id: 'mat-1',
          material_code: 'PKG-001',
          material_name: 'Test',
          material_type: 'film',
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await service.searchMaterials('test');

      expect(result[0].active).toBe(true);
    });

    it('should preserve complex nested structures', async () => {
      const complexData = [
        {
          id: 'mat-1',
          material_code: 'PKG-COMPLEX',
          material_name: 'Complex Material',
          material_type: 'laminate',
          specifications: {
            thickness: '75 micron',
            width: '1200mm',
            barrier_properties: 'excellent',
            custom_field: 'custom value',
          },
          safety_data: {
            food_contact_approved: true,
            migration_limits: [
              {
                substance: 'Heavy Metals',
                limit_ppm: 1.0,
                test_method: 'ICP-MS',
              },
            ],
            certifications: ['FDA', 'EU 10/2011'],
          },
          active: true,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: complexData, error: null });

      const result = await service.searchMaterials('complex');

      expect(result[0].specifications).toHaveProperty('custom_field');
      expect(result[0].safety_data).toHaveProperty('certifications');
    });
  });

  describe('Performance Requirements', () => {
    it('should complete searchMaterials within 1 second', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        id: `mat-${i}`,
        material_code: `PKG-${i}`,
        material_name: `Material ${i}`,
        material_type: 'film',
        active: true,
      }));

      mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

      const startTime = Date.now();
      await service.searchMaterials('test');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should complete getMaterialByCode within 1 second', async () => {
      const mockData = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'film',
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const startTime = Date.now();
      await service.getMaterialByCode('PKG-001');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should complete getSafetySuggestions within 2 seconds', async () => {
      const mockData = {
        id: 'mat-1',
        material_code: 'PKG-001',
        material_name: 'Test Material',
        material_type: 'film',
        migration_limits: [
          { substance: 'Lead', limit_ppm: 0.5, test_method: 'ICP-MS' },
        ],
        safety_data: { food_contact_approved: false },
        compatibility_matrix: { incompatible_with: ['alcohol'] },
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const startTime = Date.now();
      await service.getSafetySuggestions('PKG-001', 'Packaging defect description');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Material Types', () => {
    it('should handle all material types', async () => {
      const materialTypes = ['film', 'laminate', 'pouch', 'reel', 'other'] as const;

      for (const type of materialTypes) {
        const mockData = [
          {
            id: `mat-${type}`,
            material_code: `PKG-${type.toUpperCase()}`,
            material_name: `${type} Material`,
            material_type: type,
            active: true,
          },
        ];

        mockSupabase.limit.mockResolvedValue({ data: mockData, error: null });

        const result = await service.searchMaterials(type);

        expect(result[0].material_type).toBe(type);
      }
    });
  });
});
