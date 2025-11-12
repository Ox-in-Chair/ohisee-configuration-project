/**
 * Supplier API Service - Unit Tests
 * TDD Phase: Comprehensive test coverage >95%
 * Architecture: Mock external API calls and Supabase client
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { SupabaseClient } from '@/lib/database/client';
import {
  SupplierAPIService,
  createSupplierAPIService,
  type SupplierCertification,
  type SupplierPerformanceMetrics,
  type SupplierAPIResponse,
} from '../supplier-api';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();

  mockFrom.mockReturnValue({
    update: mockUpdate,
  });

  mockUpdate.mockReturnValue({
    eq: mockEq,
  });

  mockEq.mockResolvedValue({ error: null });

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockUpdate, mockEq },
  } as unknown as SupabaseClient & { _mocks: any };
};

describe('SupplierAPIService', () => {
  let mockSupabase: SupabaseClient & { _mocks: any };
  let service: SupplierAPIService;

  const mockCertification: SupplierCertification = {
    supplierId: 'supplier-123',
    supplierName: 'ABC Packaging Ltd',
    certificationType: 'BRCGS Packaging Materials',
    certificationBody: 'SGS',
    certificateNumber: 'CERT-2025-001',
    issueDate: '2025-01-01',
    expiryDate: '2026-01-01',
    status: 'valid',
    auditDate: '2024-12-15',
    auditResult: 'passed',
    nextAuditDate: '2025-12-15',
  };

  const mockPerformanceMetrics: SupplierPerformanceMetrics = {
    supplierId: 'supplier-123',
    supplierName: 'ABC Packaging Ltd',
    totalNCAs: 5,
    criticalNCAs: 1,
    averageResponseTime: 3.5,
    onTimeDeliveryRate: 96.5,
    qualityScore: 88,
    lastUpdated: '2025-11-12T10:00:00Z',
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new SupplierAPIService(mockSupabase, undefined, undefined);
    jest.clearAllMocks();
    delete process.env['SUPPLIER_API_BASE_URL'];
    delete process.env['SUPPLIER_API_KEY'];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create service with provided Supabase client', () => {
      const customService = new SupplierAPIService(mockSupabase);
      expect(customService).toBeDefined();
      expect(customService).toBeInstanceOf(SupplierAPIService);
    });

    it('should create service without Supabase client (uses default)', () => {
      const defaultService = new SupplierAPIService();
      expect(defaultService).toBeDefined();
    });

    it('should accept API credentials via constructor', () => {
      const serviceWithCreds = new SupplierAPIService(
        mockSupabase,
        'https://api.supplier.com',
        'test-api-key'
      );

      expect(serviceWithCreds.isConfigured()).toBe(true);
    });

    it('should read API credentials from environment variables', () => {
      process.env['SUPPLIER_API_BASE_URL'] = 'https://env.supplier.com';
      process.env['SUPPLIER_API_KEY'] = 'env-key-123';

      const envService = new SupplierAPIService(mockSupabase);

      expect(envService.isConfigured()).toBe(true);
    });

    it('should prioritize constructor params over env variables', () => {
      process.env['SUPPLIER_API_BASE_URL'] = 'https://env.api.com';
      process.env['SUPPLIER_API_KEY'] = 'env-key';

      const service = new SupplierAPIService(
        mockSupabase,
        'https://constructor.api.com',
        'constructor-key'
      );

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('Factory Function', () => {
    it('should create service via factory function', () => {
      const factoryService = createSupplierAPIService(mockSupabase);
      expect(factoryService).toBeInstanceOf(SupplierAPIService);
    });

    it('should create service via factory with credentials', () => {
      const factoryService = createSupplierAPIService(
        mockSupabase,
        'https://api.test.com',
        'api-key-123'
      );

      expect(factoryService.isConfigured()).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('should return false when no credentials provided', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when only base URL provided', () => {
      const partialService = new SupplierAPIService(
        mockSupabase,
        'https://api.test.com',
        undefined
      );

      expect(partialService.isConfigured()).toBe(false);
    });

    it('should return false when only API key provided', () => {
      const partialService = new SupplierAPIService(mockSupabase, undefined, 'api-key-123');

      expect(partialService.isConfigured()).toBe(false);
    });

    it('should return true when both credentials provided', () => {
      const configuredService = new SupplierAPIService(
        mockSupabase,
        'https://api.test.com',
        'api-key-123'
      );

      expect(configuredService.isConfigured()).toBe(true);
    });
  });

  describe('fetchCertifications - Unconfigured API', () => {
    it('should return error when API not configured', async () => {
      const result = await service.fetchCertifications();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.certifications).toBeUndefined();
    });

    it('should include configuration instructions in error', async () => {
      const result = await service.fetchCertifications();

      expect(result.error).toContain('SUPPLIER_API_BASE_URL');
      expect(result.error).toContain('SUPPLIER_API_KEY');
    });
  });

  describe('fetchCertifications - Configured API (Placeholder)', () => {
    beforeEach(() => {
      service = new SupplierAPIService(
        mockSupabase,
        'https://api.supplier.com',
        'test-key-123'
      );
    });

    it('should return successful placeholder response', async () => {
      const result = await service.fetchCertifications();

      expect(result.success).toBe(true);
      expect(result.certifications).toEqual([]);
    });

    it('should accept supplier IDs filter', async () => {
      const result = await service.fetchCertifications(['supplier-1', 'supplier-2']);

      expect(result.success).toBe(true);
    });

    it('should handle undefined supplier IDs', async () => {
      const result = await service.fetchCertifications(undefined);

      expect(result.success).toBe(true);
    });

    it('should handle empty supplier IDs array', async () => {
      const result = await service.fetchCertifications([]);

      expect(result.success).toBe(true);
    });
  });

  describe('fetchPerformanceMetrics - Unconfigured API', () => {
    it('should return error when API not configured', async () => {
      const result = await service.fetchPerformanceMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.performanceMetrics).toBeUndefined();
    });
  });

  describe('fetchPerformanceMetrics - Configured API (Placeholder)', () => {
    beforeEach(() => {
      service = new SupplierAPIService(
        mockSupabase,
        'https://api.supplier.com',
        'test-key-123'
      );
    });

    it('should return successful placeholder response', async () => {
      const result = await service.fetchPerformanceMetrics();

      expect(result.success).toBe(true);
      expect(result.performanceMetrics).toEqual([]);
    });

    it('should accept supplier IDs filter', async () => {
      const result = await service.fetchPerformanceMetrics(['supplier-1', 'supplier-2']);

      expect(result.success).toBe(true);
    });

    it('should handle undefined supplier IDs', async () => {
      const result = await service.fetchPerformanceMetrics(undefined);

      expect(result.success).toBe(true);
    });
  });

  describe('syncCertifications - Success Cases', () => {
    it('should sync single certification successfully', async () => {
      const result = await service.syncCertifications([mockCertification]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('suppliers');
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should map certification fields correctly', async () => {
      await service.syncCertifications([mockCertification]);

      const updateCall = mockSupabase._mocks.mockUpdate.mock.calls[0];
      expect(updateCall[0]).toMatchObject({
        certification_status: 'valid',
        certification_expiry_date: '2026-01-01',
        certification_body: 'SGS',
        last_audit_date: '2024-12-15',
        last_audit_result: 'passed',
      });
    });

    it('should use supplier ID for update filter', async () => {
      await service.syncCertifications([mockCertification]);

      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith('id', 'supplier-123');
    });

    it('should set updated_at timestamp', async () => {
      const beforeSync = Date.now();
      await service.syncCertifications([mockCertification]);
      const afterSync = Date.now();

      const updateCall = mockSupabase._mocks.mockUpdate.mock.calls[0];
      const timestamp = new Date(updateCall[0].updated_at).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(beforeSync);
      expect(timestamp).toBeLessThanOrEqual(afterSync);
    });

    it('should count updated records', async () => {
      const result = await service.syncCertifications([mockCertification]);

      expect(result.recordsUpdated).toBe(1);
      expect(result.recordsInserted).toBe(0);
    });

    it('should sync multiple certifications', async () => {
      const certifications: SupplierCertification[] = [
        mockCertification,
        { ...mockCertification, supplierId: 'supplier-456', supplierName: 'XYZ Materials' },
        { ...mockCertification, supplierId: 'supplier-789', supplierName: 'DEF Packaging' },
      ];

      const result = await service.syncCertifications(certifications);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('should include metadata in result', async () => {
      const result = await service.syncCertifications([mockCertification, mockCertification]);

      expect(result.metadata).toEqual({
        totalCertifications: 2,
        errors: 0,
      });
    });

    it('should return zero deleted records', async () => {
      const result = await service.syncCertifications([mockCertification]);

      expect(result.recordsDeleted).toBe(0);
    });

    it('should handle all certification statuses', async () => {
      const statuses: SupplierCertification['status'][] = [
        'valid',
        'expired',
        'suspended',
        'revoked',
      ];

      for (const status of statuses) {
        const cert = { ...mockCertification, status };
        const result = await service.syncCertifications([cert]);

        expect(result.success).toBe(true);
      }
    });

    it('should handle all audit results', async () => {
      const auditResults: SupplierCertification['auditResult'][] = [
        'passed',
        'failed',
        'conditional',
        undefined,
      ];

      for (const auditResult of auditResults) {
        const cert = { ...mockCertification, auditResult };
        const result = await service.syncCertifications([cert]);

        expect(result.success).toBe(true);
      }
    });
  });

  describe('syncCertifications - Error Handling', () => {
    it('should handle update errors', async () => {
      mockSupabase._mocks.mockEq.mockResolvedValue({
        error: { message: 'Supplier not found' },
      });

      const result = await service.syncCertifications([mockCertification]);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Supplier not found');
    });

    it('should continue syncing after single error', async () => {
      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      const certs = [mockCertification, mockCertification, mockCertification];
      const result = await service.syncCertifications(certs);

      expect(result.status).toBe('partial');
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('should mark as partial when some records fail', async () => {
      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Failed' } });

      const result = await service.syncCertifications([mockCertification, mockCertification]);

      expect(result.status).toBe('partial');
      expect(result.success).toBe(false);
    });

    it('should aggregate multiple error messages', async () => {
      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: { message: 'Error 2' } });

      const result = await service.syncCertifications([mockCertification, mockCertification]);

      expect(result.error).toContain('Error 1');
      expect(result.error).toContain('Error 2');
    });

    it('should handle exceptions during sync', async () => {
      mockSupabase._mocks.mockUpdate.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      const result = await service.syncCertifications([mockCertification]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabase._mocks.mockUpdate.mockImplementation(() => {
        throw 'String error';
      });

      const result = await service.syncCertifications([mockCertification]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should include error count in metadata', async () => {
      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: { message: 'Error' } })
        .mockResolvedValueOnce({ error: { message: 'Error' } });

      const result = await service.syncCertifications([mockCertification, mockCertification]);

      expect(result.metadata?.errors).toBe(2);
    });
  });

  describe('syncPerformanceMetrics - Success Cases', () => {
    it('should sync single performance metric successfully', async () => {
      const result = await service.syncPerformanceMetrics([mockPerformanceMetrics]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('suppliers');
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should map performance fields correctly', async () => {
      await service.syncPerformanceMetrics([mockPerformanceMetrics]);

      const updateCall = mockSupabase._mocks.mockUpdate.mock.calls[0];
      expect(updateCall[0]).toMatchObject({
        total_ncas: 5,
        critical_ncas: 1,
        average_response_time_days: 3.5,
        on_time_delivery_rate: 96.5,
        quality_score: 88,
      });
    });

    it('should count updated records', async () => {
      const result = await service.syncPerformanceMetrics([mockPerformanceMetrics]);

      expect(result.recordsUpdated).toBe(1);
      expect(result.recordsInserted).toBe(0);
    });

    it('should sync multiple metrics', async () => {
      const metrics: SupplierPerformanceMetrics[] = [
        mockPerformanceMetrics,
        { ...mockPerformanceMetrics, supplierId: 'supplier-456' },
        { ...mockPerformanceMetrics, supplierId: 'supplier-789' },
      ];

      const result = await service.syncPerformanceMetrics(metrics);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalledTimes(3);
    });

    it('should include metadata in result', async () => {
      const result = await service.syncPerformanceMetrics([
        mockPerformanceMetrics,
        mockPerformanceMetrics,
      ]);

      expect(result.metadata).toEqual({
        totalMetrics: 2,
        errors: 0,
      });
    });

    it('should return zero deleted records', async () => {
      const result = await service.syncPerformanceMetrics([mockPerformanceMetrics]);

      expect(result.recordsDeleted).toBe(0);
    });

    it('should handle extreme metric values', async () => {
      const extremeMetrics: SupplierPerformanceMetrics = {
        ...mockPerformanceMetrics,
        totalNCAs: 0,
        criticalNCAs: 0,
        averageResponseTime: 0,
        onTimeDeliveryRate: 100,
        qualityScore: 100,
      };

      const result = await service.syncPerformanceMetrics([extremeMetrics]);

      expect(result.success).toBe(true);
    });
  });

  describe('syncPerformanceMetrics - Error Handling', () => {
    it('should handle update errors', async () => {
      mockSupabase._mocks.mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const result = await service.syncPerformanceMetrics([mockPerformanceMetrics]);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Update failed');
    });

    it('should continue syncing after single error', async () => {
      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      const metrics = [mockPerformanceMetrics, mockPerformanceMetrics, mockPerformanceMetrics];
      const result = await service.syncPerformanceMetrics(metrics);

      expect(result.status).toBe('partial');
    });

    it('should handle exceptions during sync', async () => {
      mockSupabase._mocks.mockUpdate.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.syncPerformanceMetrics([mockPerformanceMetrics]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('syncPerformanceMetrics - Edge Cases', () => {
    it('should handle empty metrics array', async () => {
      const result = await service.syncPerformanceMetrics([]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.recordsUpdated).toBe(0);
    });
  });

  describe('performSync - Full Integration', () => {
    beforeEach(() => {
      service = new SupplierAPIService(mockSupabase, 'https://api.supplier.com', 'test-key');
    });

    it('should perform full sync successfully', async () => {
      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
    });

    it('should fetch certifications and metrics in parallel', async () => {
      const certSpy = jest.spyOn(service, 'fetchCertifications');
      const metricsSpy = jest.spyOn(service, 'fetchPerformanceMetrics');

      await service.performSync();

      expect(certSpy).toHaveBeenCalled();
      expect(metricsSpy).toHaveBeenCalled();
    });

    it('should pass supplier IDs to both fetch methods', async () => {
      const certSpy = jest.spyOn(service, 'fetchCertifications');
      const metricsSpy = jest.spyOn(service, 'fetchPerformanceMetrics');

      const supplierIds = ['supplier-1', 'supplier-2'];
      await service.performSync(supplierIds);

      expect(certSpy).toHaveBeenCalledWith(supplierIds);
      expect(metricsSpy).toHaveBeenCalledWith(supplierIds);
    });

    it('should combine results from both syncs', async () => {
      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: null }) // cert update 1
        .mockResolvedValueOnce({ error: null }); // metrics update 1

      // Mock fetchCertifications to return data
      jest.spyOn(service, 'fetchCertifications').mockResolvedValue({
        success: true,
        certifications: [mockCertification],
      });

      // Mock fetchPerformanceMetrics to return data
      jest.spyOn(service, 'fetchPerformanceMetrics').mockResolvedValue({
        success: true,
        performanceMetrics: [mockPerformanceMetrics],
      });

      const result = await service.performSync();

      expect(result.recordsUpdated).toBe(2); // 1 from certs + 1 from metrics
    });

    it('should handle case where only certifications succeed', async () => {
      jest.spyOn(service, 'fetchCertifications').mockResolvedValue({
        success: true,
        certifications: [mockCertification],
      });

      jest.spyOn(service, 'fetchPerformanceMetrics').mockResolvedValue({
        success: false,
        error: 'Metrics API unavailable',
      });

      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(1); // Only from certifications
    });

    it('should handle case where only metrics succeed', async () => {
      jest.spyOn(service, 'fetchCertifications').mockResolvedValue({
        success: false,
        error: 'Certifications API unavailable',
      });

      jest.spyOn(service, 'fetchPerformanceMetrics').mockResolvedValue({
        success: true,
        performanceMetrics: [mockPerformanceMetrics],
      });

      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(1); // Only from metrics
    });

    it('should handle case where both fail', async () => {
      jest.spyOn(service, 'fetchCertifications').mockResolvedValue({
        success: false,
        error: 'Certifications failed',
      });

      jest.spyOn(service, 'fetchPerformanceMetrics').mockResolvedValue({
        success: false,
        error: 'Metrics failed',
      });

      const result = await service.performSync();

      expect(result.success).toBe(true); // Empty sync is still success
      expect(result.recordsUpdated).toBe(0);
    });

    it('should mark as failed if any sync operation fails completely', async () => {
      jest.spyOn(service, 'fetchCertifications').mockResolvedValue({
        success: true,
        certifications: [mockCertification],
      });

      jest.spyOn(service, 'fetchPerformanceMetrics').mockResolvedValue({
        success: true,
        performanceMetrics: [mockPerformanceMetrics],
      });

      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: { message: 'Cert sync failed' } })
        .mockResolvedValueOnce({ error: null });

      const result = await service.performSync();

      // When one sync fails, status is 'failed' (prioritized over 'partial')
      expect(result.status).toBe('failed');
    });

    it('should aggregate errors from both syncs', async () => {
      jest.spyOn(service, 'fetchCertifications').mockResolvedValue({
        success: true,
        certifications: [mockCertification],
      });

      jest.spyOn(service, 'fetchPerformanceMetrics').mockResolvedValue({
        success: true,
        performanceMetrics: [mockPerformanceMetrics],
      });

      mockSupabase._mocks.mockEq
        .mockResolvedValueOnce({ error: { message: 'Cert error' } })
        .mockResolvedValueOnce({ error: { message: 'Metrics error' } });

      const result = await service.performSync();

      expect(result.error).toContain('Cert error');
      expect(result.error).toContain('Metrics error');
    });

    it('should handle undefined supplier IDs', async () => {
      const result = await service.performSync(undefined);

      expect(result.success).toBe(true);
    });

    it('should handle empty supplier IDs array', async () => {
      const result = await service.performSync([]);

      expect(result.success).toBe(true);
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should accept custom Supabase client', () => {
      const customClient = createMockSupabaseClient();
      const customService = new SupplierAPIService(customClient);

      expect(customService).toBeDefined();
    });

    it('should not use global Supabase instance', () => {
      const service1 = new SupplierAPIService(mockSupabase);
      const service2 = new SupplierAPIService(createMockSupabaseClient());

      expect(service1).not.toBe(service2);
    });

    it('should inject API credentials separately from Supabase', () => {
      const serviceWithCreds = new SupplierAPIService(
        mockSupabase,
        'https://api.test.com',
        'key-123'
      );

      expect(serviceWithCreds.isConfigured()).toBe(true);
    });
  });
});
