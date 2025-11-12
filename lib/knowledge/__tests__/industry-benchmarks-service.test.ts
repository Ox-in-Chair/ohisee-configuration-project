/**
 * Industry Benchmarks Service - Comprehensive Unit Tests
 * TDD Phase: RED → GREEN → REFACTOR → VERIFY
 * Architecture: Mock Supabase client, test benchmark retrieval and comparison
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IndustryBenchmarksService, createIndustryBenchmarksService } from '../industry-benchmarks-service';
import type { SupabaseClient } from '@/lib/database/client';
import type { IndustryBenchmark } from '../industry-benchmarks-service';

// Mock Supabase client
class MockSupabaseClient {
  public from = jest.fn(() => this);
  public select = jest.fn(() => this);
  public eq = jest.fn(() => this);
  public order = jest.fn(() => this);
  public limit = jest.fn(() => this);
  public single = jest.fn(() => this);
}

describe('IndustryBenchmarksService - TDD Suite', () => {
  let mockSupabase: MockSupabaseClient;
  let service: IndustryBenchmarksService;

  beforeEach(() => {
    mockSupabase = new MockSupabaseClient();
    service = new IndustryBenchmarksService(mockSupabase as unknown as SupabaseClient);
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should accept SupabaseClient via constructor', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(IndustryBenchmarksService);
    });

    it('should create service via factory function without client', () => {
      const factoryService = createIndustryBenchmarksService();
      expect(factoryService).toBeInstanceOf(IndustryBenchmarksService);
    });

    it('should create service via factory function with client', () => {
      const factoryService = createIndustryBenchmarksService(mockSupabase as unknown as SupabaseClient);
      expect(factoryService).toBeInstanceOf(IndustryBenchmarksService);
    });
  });

  describe('getBenchmark - Single Benchmark Retrieval', () => {
    it('should retrieve benchmark by metric name and category', async () => {
      const mockData = {
        id: 'bench-1',
        metric_name: 'Response Time',
        metric_category: 'response_time',
        benchmark_value: 5.2,
        percentile_25: 2.5,
        percentile_50: 5.0,
        percentile_75: 8.0,
        percentile_90: 12.0,
        active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmark('Response Time', 'response_time');

      expect(mockSupabase.from).toHaveBeenCalledWith('industry_benchmarks');
      expect(mockSupabase.eq).toHaveBeenCalledWith('metric_name', 'Response Time');
      expect(mockSupabase.eq).toHaveBeenCalledWith('metric_category', 'response_time');
      expect(mockSupabase.eq).toHaveBeenCalledWith('active', true);
      expect(result).toBeDefined();
      expect(result?.metric_name).toBe('Response Time');
    });

    it('should filter by industry sector when provided', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      await service.getBenchmark('Defect Rate', 'defect_rate', 'packaging');

      expect(mockSupabase.eq).toHaveBeenCalledWith('industry_sector', 'packaging');
    });

    it('should order by most recent period_end', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      await service.getBenchmark('Test', 'quality_score');

      expect(mockSupabase.order).toHaveBeenCalledWith('period_end', { ascending: false });
    });

    it('should return null on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const result = await service.getBenchmark('Unknown', 'other');

      expect(result).toBeNull();
    });

    it('should return null when no data found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.getBenchmark('Test', 'cost');

      expect(result).toBeNull();
    });

    it('should map database record to IndustryBenchmark structure', async () => {
      const mockData = {
        id: 'test-123',
        metric_name: 'Quality Score',
        metric_category: 'quality_score',
        industry_sector: 'manufacturing',
        benchmark_value: 85.5,
        percentile_25: 75.0,
        percentile_50: 85.0,
        percentile_75: 90.0,
        percentile_90: 95.0,
        data_source: 'Industry Survey 2024',
        sample_size: 250,
        period_start: '2024-01-01',
        period_end: '2024-12-31',
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmark('Quality Score', 'quality_score');

      expect(result).toMatchObject({
        id: 'test-123',
        metric_name: 'Quality Score',
        metric_category: 'quality_score',
        industry_sector: 'manufacturing',
        benchmark_value: 85.5,
        percentile_25: 75.0,
        percentile_50: 85.0,
        percentile_75: 90.0,
        percentile_90: 95.0,
        data_source: 'Industry Survey 2024',
        sample_size: 250,
        period_start: '2024-01-01',
        period_end: '2024-12-31',
      });
    });
  });

  describe('compareToBenchmark - Performance Comparison', () => {
    it('should compare user value to industry benchmark', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Response Time',
        metric_category: 'response_time' as const,
        benchmark_value: 5.0,
        percentile_25: 3.0,
        percentile_50: 5.0,
        percentile_75: 8.0,
        percentile_90: 12.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Response Time', 'response_time', 4.5);

      expect(result).toBeDefined();
      expect(result?.userValue).toBe(4.5);
      expect(result?.comparison.vsMedian).toBeLessThan(0);
      expect(result?.message).toContain('Excellent performance');
    });

    it('should return null when benchmark not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.compareToBenchmark('Unknown', 'other', 10);

      expect(result).toBeNull();
    });

    it('should calculate percentage difference from median', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Test',
        metric_category: 'response_time' as const,
        benchmark_value: 10.0,
        percentile_50: 10.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Test', 'response_time', 12.0);

      expect(result?.comparison.vsMedian).toBe(20); // 20% above median
    });

    it('should calculate percentage difference from 75th percentile', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Test',
        metric_category: 'defect_rate' as const,
        benchmark_value: 2.0,
        percentile_75: 3.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Test', 'defect_rate', 2.4);

      expect(result?.comparison.vsPercentile75).toBe(-20); // 20% below 75th percentile
    });

    it('should estimate user percentile based on value', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Test',
        metric_category: 'response_time' as const,
        benchmark_value: 10.0,
        percentile_25: 5.0,
        percentile_50: 10.0,
        percentile_75: 15.0,
        percentile_90: 20.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const lowResult = await service.compareToBenchmark('Test', 'response_time', 4.0);
      expect(lowResult?.comparison.percentile).toBe(25);

      const highResult = await service.compareToBenchmark('Test', 'response_time', 16.0);
      expect(highResult?.comparison.percentile).toBe(75);

      const veryHighResult = await service.compareToBenchmark('Test', 'response_time', 21.0);
      expect(veryHighResult?.comparison.percentile).toBe(90);
    });

    it('should generate appropriate message for excellent response time', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Response Time',
        metric_category: 'response_time' as const,
        benchmark_value: 8.0,
        percentile_50: 8.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Response Time', 'response_time', 5.0);

      expect(result?.message).toContain('Excellent performance');
      expect(result?.message).toContain('5.0 days');
      expect(result?.message).toContain('8.0 days');
    });

    it('should generate message with recommendation for poor response time', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Response Time',
        metric_category: 'response_time' as const,
        benchmark_value: 5.0,
        percentile_25: 3.0,
        percentile_50: 5.0,
        percentile_75: 8.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Response Time', 'response_time', 10.0);

      expect(result?.message).toContain('Below industry average');
      expect(result?.recommendation).toBeDefined();
      expect(result?.recommendation).toContain('Review response time processes');
    });

    it('should generate appropriate message for defect rate', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Defect Rate',
        metric_category: 'defect_rate' as const,
        benchmark_value: 2.5,
        percentile_25: 1.5,
        percentile_50: 2.5,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Defect Rate', 'defect_rate', 1.2);

      expect(result?.message).toContain('Top performer');
      expect(result?.message).toContain('1.20%');
    });

    it('should generate recommendation for high defect rate', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Defect Rate',
        metric_category: 'defect_rate' as const,
        benchmark_value: 2.0,
        percentile_25: 1.0,
        percentile_50: 2.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Defect Rate', 'defect_rate', 3.5);

      expect(result?.recommendation).toBeDefined();
      expect(result?.recommendation).toContain('Review quality control processes');
    });

    it('should handle generic metric categories', async () => {
      const mockBenchmark = {
        id: '1',
        metric_name: 'Custom Metric',
        metric_category: 'other' as const,
        benchmark_value: 100.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockBenchmark, error: null });

      const result = await service.compareToBenchmark('Custom Metric', 'other', 95.0);

      expect(result?.message).toContain('95.00');
      expect(result?.message).toContain('100.00');
    });

    it('should pass industry sector to getBenchmark', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      await service.compareToBenchmark('Test', 'quality_score', 80, 'manufacturing');

      expect(mockSupabase.eq).toHaveBeenCalledWith('industry_sector', 'manufacturing');
    });
  });

  describe('getBenchmarksByCategory - Category-Based Retrieval', () => {
    it('should retrieve all benchmarks for a category', async () => {
      const mockData = [
        {
          id: '1',
          metric_name: 'Metric 1',
          metric_category: 'quality_score',
          benchmark_value: 85.0,
        },
        {
          id: '2',
          metric_name: 'Metric 2',
          metric_category: 'quality_score',
          benchmark_value: 90.0,
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmarksByCategory('quality_score');

      expect(mockSupabase.from).toHaveBeenCalledWith('industry_benchmarks');
      expect(mockSupabase.eq).toHaveBeenCalledWith('metric_category', 'quality_score');
      expect(mockSupabase.eq).toHaveBeenCalledWith('active', true);
      expect(result).toHaveLength(2);
    });

    it('should filter by industry sector when provided', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      await service.getBenchmarksByCategory('defect_rate', 'packaging');

      expect(mockSupabase.eq).toHaveBeenCalledWith('industry_sector', 'packaging');
    });

    it('should order results by most recent period', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      await service.getBenchmarksByCategory('response_time');

      expect(mockSupabase.order).toHaveBeenCalledWith('period_end', { ascending: false });
    });

    it('should return empty array on database error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: new Error('Query failed'),
      });

      const result = await service.getBenchmarksByCategory('cost');

      expect(result).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle null data gracefully', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: null });

      const result = await service.getBenchmarksByCategory('quality_score');

      expect(result).toEqual([]);
    });

    it('should map all records to correct structure', async () => {
      const mockData = [
        {
          id: '1',
          metric_name: 'Test Metric',
          metric_category: 'response_time',
          benchmark_value: 5.5,
          percentile_50: 5.0,
        },
      ];

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmarksByCategory('response_time');

      expect(result[0]).toMatchObject({
        id: '1',
        metric_name: 'Test Metric',
        metric_category: 'response_time',
        benchmark_value: 5.5,
        percentile_50: 5.0,
      });
    });
  });

  describe('Data Mapping', () => {
    it('should handle optional fields gracefully', async () => {
      const mockData = {
        id: '1',
        metric_name: 'Minimal Benchmark',
        metric_category: 'other',
        benchmark_value: 50.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmark('Minimal Benchmark', 'other');

      expect(result?.industry_sector).toBeUndefined();
      expect(result?.percentile_25).toBeUndefined();
      expect(result?.data_source).toBeUndefined();
    });

    it('should convert numeric strings to numbers', async () => {
      const mockData = {
        id: '1',
        metric_name: 'Test',
        metric_category: 'cost',
        benchmark_value: '100.5',
        percentile_25: '75.0',
        percentile_50: '100.0',
        percentile_75: '125.0',
        sample_size: '500',
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmark('Test', 'cost');

      expect(typeof result?.benchmark_value).toBe('number');
      expect(result?.benchmark_value).toBe(100.5);
      expect(typeof result?.percentile_25).toBe('number');
      expect(typeof result?.sample_size).toBe('number');
    });

    it('should preserve string fields', async () => {
      const mockData = {
        id: 'test-id',
        metric_name: 'Test Name',
        metric_category: 'quality_score',
        industry_sector: 'manufacturing',
        benchmark_value: 85,
        data_source: 'Annual Survey',
        period_start: '2024-01-01',
        period_end: '2024-12-31',
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getBenchmark('Test Name', 'quality_score');

      expect(result?.industry_sector).toBe('manufacturing');
      expect(result?.data_source).toBe('Annual Survey');
      expect(result?.period_start).toBe('2024-01-01');
      expect(result?.period_end).toBe('2024-12-31');
    });
  });

  describe('Performance Requirements', () => {
    it('should complete getBenchmark within 1 second', async () => {
      const mockData = {
        id: '1',
        metric_name: 'Test',
        metric_category: 'response_time',
        benchmark_value: 5.0,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const startTime = Date.now();
      await service.getBenchmark('Test', 'response_time');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should complete compareToBenchmark within 2 seconds', async () => {
      const mockData = {
        id: '1',
        metric_name: 'Test',
        metric_category: 'defect_rate',
        benchmark_value: 2.0,
        percentile_25: 1.5,
        percentile_50: 2.0,
        percentile_75: 2.5,
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const startTime = Date.now();
      await service.compareToBenchmark('Test', 'defect_rate', 1.8);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should complete getBenchmarksByCategory within 2 seconds', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        metric_name: `Metric ${i}`,
        metric_category: 'quality_score',
        benchmark_value: 80 + i,
      }));

      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const startTime = Date.now();
      await service.getBenchmarksByCategory('quality_score');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});
