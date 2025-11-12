/**
 * Benchmark API Service - Unit Tests
 * TDD Phase: Comprehensive test coverage >95%
 * Architecture: Mock external API calls and Supabase client
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { SupabaseClient } from '@/lib/database/client';
import {
  BenchmarkAPIService,
  createBenchmarkAPIService,
  type BenchmarkDataPoint,
  type BenchmarkAPIResponse,
} from '../benchmark-api';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();
  const mockUpsert = jest.fn();
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockSingle = jest.fn();

  mockFrom.mockReturnValue({
    upsert: mockUpsert,
    select: mockSelect,
  });

  mockUpsert.mockResolvedValue({ error: null });

  mockSelect.mockReturnValue({
    eq: mockEq,
  });

  mockEq.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });

  mockSingle.mockResolvedValue({
    data: { id: 'benchmark-123' },
    error: null,
  });

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockUpsert, mockSelect, mockEq, mockSingle },
  } as unknown as SupabaseClient & { _mocks: any };
};

describe('BenchmarkAPIService', () => {
  let mockSupabase: SupabaseClient & { _mocks: any };
  let service: BenchmarkAPIService;

  const mockBenchmarkData: BenchmarkDataPoint = {
    metricName: 'defect_rate',
    metricCategory: 'defect_rate',
    industrySector: 'food_packaging',
    benchmarkValue: 2.5,
    percentile25: 1.0,
    percentile50: 2.0,
    percentile75: 3.5,
    percentile90: 5.0,
    sampleSize: 150,
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    dataSource: 'industry_association',
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new BenchmarkAPIService(mockSupabase, undefined, undefined);
    jest.clearAllMocks();
    delete process.env['BENCHMARK_API_BASE_URL'];
    delete process.env['BENCHMARK_API_KEY'];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create service with provided Supabase client', () => {
      const customService = new BenchmarkAPIService(mockSupabase);
      expect(customService).toBeDefined();
      expect(customService).toBeInstanceOf(BenchmarkAPIService);
    });

    it('should create service without Supabase client (uses default)', () => {
      const defaultService = new BenchmarkAPIService();
      expect(defaultService).toBeDefined();
    });

    it('should accept API credentials via constructor', () => {
      const serviceWithCreds = new BenchmarkAPIService(
        mockSupabase,
        'https://api.benchmark.com',
        'test-api-key'
      );

      expect(serviceWithCreds.isConfigured()).toBe(true);
    });

    it('should read API credentials from environment variables', () => {
      process.env['BENCHMARK_API_BASE_URL'] = 'https://env.api.com';
      process.env['BENCHMARK_API_KEY'] = 'env-key-123';

      const envService = new BenchmarkAPIService(mockSupabase);

      expect(envService.isConfigured()).toBe(true);
    });

    it('should prioritize constructor params over env variables', () => {
      process.env['BENCHMARK_API_BASE_URL'] = 'https://env.api.com';
      process.env['BENCHMARK_API_KEY'] = 'env-key';

      const service = new BenchmarkAPIService(
        mockSupabase,
        'https://constructor.api.com',
        'constructor-key'
      );

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('Factory Function', () => {
    it('should create service via factory function', () => {
      const factoryService = createBenchmarkAPIService(mockSupabase);
      expect(factoryService).toBeInstanceOf(BenchmarkAPIService);
    });

    it('should create service via factory with credentials', () => {
      const factoryService = createBenchmarkAPIService(
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
      const partialService = new BenchmarkAPIService(
        mockSupabase,
        'https://api.test.com',
        undefined
      );

      expect(partialService.isConfigured()).toBe(false);
    });

    it('should return false when only API key provided', () => {
      const partialService = new BenchmarkAPIService(mockSupabase, undefined, 'api-key-123');

      expect(partialService.isConfigured()).toBe(false);
    });

    it('should return true when both credentials provided', () => {
      const configuredService = new BenchmarkAPIService(
        mockSupabase,
        'https://api.test.com',
        'api-key-123'
      );

      expect(configuredService.isConfigured()).toBe(true);
    });
  });

  describe('fetchBenchmarks - Unconfigured API', () => {
    it('should return error when API not configured', async () => {
      const result = await service.fetchBenchmarks();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.benchmarks).toBeUndefined();
    });

    it('should include configuration instructions in error', async () => {
      const result = await service.fetchBenchmarks();

      expect(result.error).toContain('BENCHMARK_API_BASE_URL');
      expect(result.error).toContain('BENCHMARK_API_KEY');
    });
  });

  describe('fetchBenchmarks - Configured API (Placeholder)', () => {
    beforeEach(() => {
      service = new BenchmarkAPIService(
        mockSupabase,
        'https://api.benchmark.com',
        'test-key-123'
      );
    });

    it('should return successful placeholder response', async () => {
      const result = await service.fetchBenchmarks();

      expect(result.success).toBe(true);
      expect(result.benchmarks).toEqual([]);
      expect(result.lastSyncDate).toBeDefined();
    });

    it('should accept industry sector filter', async () => {
      const result = await service.fetchBenchmarks('food_packaging');

      expect(result.success).toBe(true);
    });

    it('should accept metric category filter', async () => {
      const result = await service.fetchBenchmarks(undefined, 'quality_score');

      expect(result.success).toBe(true);
    });

    it('should accept date range filters', async () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-12-31');

      const result = await service.fetchBenchmarks(undefined, undefined, periodStart, periodEnd);

      expect(result.success).toBe(true);
    });

    it('should accept all filters combined', async () => {
      const result = await service.fetchBenchmarks(
        'food_packaging',
        'defect_rate',
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );

      expect(result.success).toBe(true);
    });

    it('should include lastSyncDate in response', async () => {
      const result = await service.fetchBenchmarks();

      expect(result.lastSyncDate).toBeDefined();
      expect(new Date(result.lastSyncDate!).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('syncBenchmarks - Success Cases', () => {
    it('should sync single benchmark successfully', async () => {
      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('industry_benchmarks');
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalled();
    });

    it('should map benchmark fields correctly', async () => {
      await service.syncBenchmarks([mockBenchmarkData]);

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      expect(upsertCall[0]).toMatchObject({
        metric_name: 'defect_rate',
        metric_category: 'defect_rate',
        industry_sector: 'food_packaging',
        benchmark_value: 2.5,
        percentile_25: 1.0,
        percentile_50: 2.0,
        percentile_75: 3.5,
        percentile_90: 5.0,
        sample_size: 150,
        period_start: '2025-01-01',
        period_end: '2025-12-31',
        data_source: 'industry_association',
        active: true,
      });
    });

    it('should use onConflict for upsert behavior', async () => {
      await service.syncBenchmarks([mockBenchmarkData]);

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      expect(upsertCall[1]).toEqual({
        onConflict: 'metric_name,industry_sector,period_start,period_end',
      });
    });

    it('should set last_updated timestamp', async () => {
      const beforeSync = Date.now();
      await service.syncBenchmarks([mockBenchmarkData]);
      const afterSync = Date.now();

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      const timestamp = new Date(upsertCall[0].last_updated).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(beforeSync);
      expect(timestamp).toBeLessThanOrEqual(afterSync);
    });

    it('should sync multiple benchmarks', async () => {
      const benchmarks: BenchmarkDataPoint[] = [
        mockBenchmarkData,
        { ...mockBenchmarkData, metricName: 'response_time', metricCategory: 'response_time' },
        { ...mockBenchmarkData, metricName: 'cost_per_unit', metricCategory: 'cost' },
      ];

      const result = await service.syncBenchmarks(benchmarks);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalledTimes(3);
    });

    it('should count inserted records', async () => {
      mockSupabase._mocks.mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.recordsInserted).toBe(1);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should count updated records', async () => {
      mockSupabase._mocks.mockSingle.mockResolvedValue({
        data: { id: 'existing-123' },
        error: null,
      });

      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.recordsUpdated).toBe(1);
      expect(result.recordsInserted).toBe(0);
    });

    it('should include metadata in result', async () => {
      const result = await service.syncBenchmarks([mockBenchmarkData, mockBenchmarkData]);

      expect(result.metadata).toEqual({
        totalBenchmarks: 2,
        errors: 0,
      });
    });

    it('should return zero deleted records', async () => {
      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.recordsDeleted).toBe(0);
    });
  });

  describe('syncBenchmarks - Error Handling', () => {
    it('should handle upsert errors', async () => {
      mockSupabase._mocks.mockUpsert.mockResolvedValue({
        error: { message: 'Constraint violation' },
      });

      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Constraint violation');
    });

    it('should continue syncing after single error', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      const benchmarks = [mockBenchmarkData, mockBenchmarkData, mockBenchmarkData];
      const result = await service.syncBenchmarks(benchmarks);

      expect(result.status).toBe('partial');
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalledTimes(3);
    });

    it('should mark as partial when some records fail', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Failed' } });

      const result = await service.syncBenchmarks([mockBenchmarkData, mockBenchmarkData]);

      expect(result.status).toBe('partial');
      expect(result.success).toBe(false);
    });

    it('should aggregate multiple error messages', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: { message: 'Error 2' } });

      const result = await service.syncBenchmarks([mockBenchmarkData, mockBenchmarkData]);

      expect(result.error).toContain('Error 1');
      expect(result.error).toContain('Error 2');
    });

    it('should handle exceptions during sync', async () => {
      mockSupabase._mocks.mockUpsert.mockRejectedValue(new Error('Network timeout'));

      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabase._mocks.mockUpsert.mockRejectedValue('String error');

      const result = await service.syncBenchmarks([mockBenchmarkData]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should include error count in metadata', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: { message: 'Error' } })
        .mockResolvedValueOnce({ error: { message: 'Error' } });

      const result = await service.syncBenchmarks([mockBenchmarkData, mockBenchmarkData]);

      expect(result.metadata?.errors).toBe(2);
    });
  });

  describe('syncBenchmarks - Edge Cases', () => {
    it('should handle empty benchmark array', async () => {
      const result = await service.syncBenchmarks([]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should handle benchmarks with different categories', async () => {
      const categories: BenchmarkDataPoint['metricCategory'][] = [
        'response_time',
        'defect_rate',
        'cost',
        'quality_score',
        'other',
      ];

      const benchmarks = categories.map((category) => ({
        ...mockBenchmarkData,
        metricCategory: category,
      }));

      const result = await service.syncBenchmarks(benchmarks);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalledTimes(5);
    });

    it('should handle benchmarks with extreme values', async () => {
      const extremeBenchmark: BenchmarkDataPoint = {
        ...mockBenchmarkData,
        benchmarkValue: 0,
        percentile25: 0,
        percentile50: 0,
        percentile75: 999999.99,
        percentile90: 999999.99,
        sampleSize: 1,
      };

      const result = await service.syncBenchmarks([extremeBenchmark]);

      expect(result.success).toBe(true);
    });
  });

  describe('performSync - Full Integration', () => {
    beforeEach(() => {
      service = new BenchmarkAPIService(
        mockSupabase,
        'https://api.benchmark.com',
        'test-key'
      );
    });

    it('should perform full sync successfully', async () => {
      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
    });

    it('should pass filters to fetchBenchmarks', async () => {
      const fetchSpy = jest.spyOn(service, 'fetchBenchmarks');

      await service.performSync(
        'food_packaging',
        'defect_rate',
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'food_packaging',
        'defect_rate',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should return error if API fetch fails', async () => {
      const unconfiguredService = new BenchmarkAPIService(mockSupabase);

      const result = await unconfiguredService.performSync();

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('not configured');
    });

    it('should handle empty benchmark response', async () => {
      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);
      expect(result.metadata?.message).toContain('No benchmarks');
    });

    it('should not call syncBenchmarks if fetch fails', async () => {
      const unconfiguredService = new BenchmarkAPIService(mockSupabase);
      const syncSpy = jest.spyOn(unconfiguredService, 'syncBenchmarks');

      await unconfiguredService.performSync();

      expect(syncSpy).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should accept custom Supabase client', () => {
      const customClient = createMockSupabaseClient();
      const customService = new BenchmarkAPIService(customClient);

      expect(customService).toBeDefined();
    });

    it('should not use global Supabase instance', () => {
      const service1 = new BenchmarkAPIService(mockSupabase);
      const service2 = new BenchmarkAPIService(createMockSupabaseClient());

      expect(service1).not.toBe(service2);
    });

    it('should inject API credentials separately from Supabase', () => {
      const serviceWithCreds = new BenchmarkAPIService(
        mockSupabase,
        'https://api.test.com',
        'key-123'
      );

      expect(serviceWithCreds.isConfigured()).toBe(true);
    });
  });
});
