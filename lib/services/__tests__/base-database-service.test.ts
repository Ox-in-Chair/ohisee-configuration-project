/**
 * Base Database Service Unit Tests
 * Tests abstract service providing common query patterns
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  BaseDatabaseService,
  type ListOptions,
  type ListResponse,
  type SingleResponse,
  type OperationResponse,
} from '../base-database-service';

// Concrete implementation for testing
class TestDatabaseService extends BaseDatabaseService<
  { id: string; name: string; status: string; created_at: string },
  { name: string; status: string },
  { name?: string; status?: string }
> {
  constructor(client: SupabaseClient<Database>) {
    super(client, 'test_table');
  }

  // Expose protected methods for testing
  public testApplyPagination(query: any, page?: number, pageSize?: number) {
    return this.applyPagination(query, page, pageSize);
  }

  public testApplySorting(query: any, sortBy?: string, sortDir?: 'asc' | 'desc') {
    return this.applySorting(query, sortBy, sortDir);
  }

  public testApplyStatusFilter(query: any, status?: string) {
    return this.applyStatusFilter(query, status);
  }

  public testBuildSelectQuery(fields: string) {
    return this.buildSelectQuery(fields);
  }

  public testExecuteSingleQuery<T>(query: any) {
    return this.executeSingleQuery<T>(query);
  }

  public testExecuteListQuery<T>(query: any) {
    return this.executeListQuery<T>(query);
  }

  public testCount(filters?: Record<string, any>) {
    return this.count(filters);
  }
}

describe('BaseDatabaseService', () => {
  let mockSupabaseClient: jest.Mocked<SupabaseClient<Database>>;
  let service: TestDatabaseService;
  let mockQuery: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock query object
    mockQuery = {
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => mockQuery),
        delete: jest.fn(() => mockQuery),
      })),
    } as unknown as jest.Mocked<SupabaseClient<Database>>;

    // Create test service instance
    service = new TestDatabaseService(mockSupabaseClient);
  });

  describe('Constructor', () => {
    it('should initialize with client and table name', () => {
      expect(service).toBeInstanceOf(BaseDatabaseService);
      expect(service).toBeInstanceOf(TestDatabaseService);
    });
  });

  describe('applyPagination', () => {
    it('should apply default limit when no page provided', () => {
      const result = service.testApplyPagination(mockQuery);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.range).not.toHaveBeenCalled();
    });

    it('should apply range when page is provided', () => {
      service.testApplyPagination(mockQuery, 2, 10);

      expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
      expect(mockQuery.limit).not.toHaveBeenCalled();
    });

    it('should calculate correct offset for page 1', () => {
      service.testApplyPagination(mockQuery, 1, 10);

      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });

    it('should calculate correct offset for page 3 with custom page size', () => {
      service.testApplyPagination(mockQuery, 3, 25);

      expect(mockQuery.range).toHaveBeenCalledWith(50, 74);
    });

    it('should use custom page size', () => {
      service.testApplyPagination(mockQuery, undefined, 50);

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });

    it('should not apply pagination when page is 0', () => {
      service.testApplyPagination(mockQuery, 0, 10);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.range).not.toHaveBeenCalled();
    });
  });

  describe('applySorting', () => {
    it('should apply default sorting (created_at desc)', () => {
      service.testApplySorting(mockQuery);

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should apply custom sort field', () => {
      service.testApplySorting(mockQuery, 'name');

      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: false });
    });

    it('should apply ascending sort direction', () => {
      service.testApplySorting(mockQuery, 'name', 'asc');

      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('should apply descending sort direction', () => {
      service.testApplySorting(mockQuery, 'status', 'desc');

      expect(mockQuery.order).toHaveBeenCalledWith('status', { ascending: false });
    });
  });

  describe('applyStatusFilter', () => {
    it('should not apply filter when status is undefined', () => {
      const result = service.testApplyStatusFilter(mockQuery, undefined);

      expect(mockQuery.eq).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('should apply status filter when provided', () => {
      service.testApplyStatusFilter(mockQuery, 'open');

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'open');
    });

    it('should apply different status values', () => {
      service.testApplyStatusFilter(mockQuery, 'closed');

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'closed');
    });
  });

  describe('buildSelectQuery', () => {
    it('should build select query with specified fields', () => {
      const fromMock = jest.fn(() => ({
        select: jest.fn(),
      }));
      mockSupabaseClient.from = fromMock;

      service.testBuildSelectQuery('id, name, status');

      expect(fromMock).toHaveBeenCalledWith('test_table');
    });

    it('should include count option', () => {
      const selectMock = jest.fn();
      const fromMock = jest.fn(() => ({
        select: selectMock,
      }));
      mockSupabaseClient.from = fromMock;

      service.testBuildSelectQuery('*');

      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact' });
    });
  });

  describe('executeSingleQuery', () => {
    it('should return data on successful query', async () => {
      const mockData = { id: '1', name: 'Test', status: 'open', created_at: '2025-01-01' };
      mockQuery.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.testExecuteSingleQuery(mockQuery);

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeUndefined();
    });

    it('should return error on failed query', async () => {
      const mockError = { message: 'Record not found', code: 'PGRST116' };
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const result = await service.testExecuteSingleQuery(mockQuery);

      expect(result.data).toBeNull();
      expect(result.error).toContain('Database error');
      expect(result.error).toContain('Record not found');
    });
  });

  describe('executeListQuery', () => {
    it('should return data and count on successful query', async () => {
      const mockData = [
        { id: '1', name: 'Test 1', status: 'open', created_at: '2025-01-01' },
        { id: '2', name: 'Test 2', status: 'closed', created_at: '2025-01-02' },
      ];
      const mockPromise = Promise.resolve({ data: mockData, error: null, count: 2 });
      const queryWithThen = Object.assign(mockQuery, mockPromise);

      const result = await service.testExecuteListQuery(queryWithThen);

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should return empty array on error', async () => {
      const mockError = { message: 'Connection failed' };
      const mockPromise = Promise.resolve({ data: null, error: mockError, count: 0 });
      const queryWithThen = Object.assign(mockQuery, mockPromise);

      const result = await service.testExecuteListQuery(queryWithThen);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.error).toContain('Database error');
    });

    it('should handle null data with no error', async () => {
      const mockPromise = Promise.resolve({ data: null, error: null, count: 0 });
      const queryWithThen = Object.assign(mockQuery, mockPromise);

      const result = await service.testExecuteListQuery(queryWithThen);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getById', () => {
    it('should fetch record by ID', async () => {
      const mockData = { id: '123', name: 'Test', status: 'open', created_at: '2025-01-01' };
      mockQuery.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.getById('123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_table');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123');
      expect(result.data).toEqual(mockData);
    });

    it('should return null when record not found', async () => {
      const mockError = { message: 'Not found', code: 'PGRST116' };
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const result = await service.getById('999');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete record by ID', async () => {
      mockQuery.eq.mockResolvedValue({ error: null });
      const deleteMock = jest.fn(() => mockQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        delete: deleteMock,
      })) as any;

      const result = await service.delete('123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_table');
      expect(deleteMock).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error on failed deletion', async () => {
      const mockError = { message: 'Permission denied' };
      mockQuery.eq.mockResolvedValue({ error: mockError });
      const deleteMock = jest.fn(() => mockQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        delete: deleteMock,
      })) as any;

      const result = await service.delete('123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete record');
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('count', () => {
    it('should count all records when no filters provided', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const countQuery = {
        eq: mockEq,
      };
      const selectMock = jest.fn(() => countQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        select: selectMock,
      })) as any;

      countQuery.eq = jest.fn(async () => ({ count: 42, error: null }));

      const result = await service.testCount();

      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(result).toBe(42);
    });

    it('should apply filters to count query', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const countQuery = {
        eq: mockEq,
      };
      const selectMock = jest.fn(() => countQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        select: selectMock,
      })) as any;

      countQuery.eq = jest.fn(async () => ({ count: 10, error: null }));

      const result = await service.testCount({ status: 'open' });

      expect(mockEq).toHaveBeenCalledWith('status', 'open');
      expect(result).toBe(10);
    });

    it('should handle multiple filters', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const countQuery = {
        eq: mockEq,
      };
      const selectMock = jest.fn(() => countQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        select: selectMock,
      })) as any;

      countQuery.eq = jest.fn(async () => ({ count: 5, error: null }));

      const result = await service.testCount({ status: 'open', name: 'Test' });

      expect(mockEq).toHaveBeenCalledTimes(2);
      expect(result).toBe(5);
    });

    it('should return 0 on database error', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const countQuery = {
        eq: mockEq,
      };
      const selectMock = jest.fn(() => countQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        select: selectMock,
      })) as any;

      countQuery.eq = jest.fn(async () => ({ count: null, error: { message: 'Error' } }));

      const result = await service.testCount();

      expect(result).toBe(0);
    });

    it('should return 0 when count is null', async () => {
      const mockEq = jest.fn().mockReturnThis();
      const countQuery = {
        eq: mockEq,
      };
      const selectMock = jest.fn(() => countQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        select: selectMock,
      })) as any;

      countQuery.eq = jest.fn(async () => ({ count: null, error: null }));

      const result = await service.testCount();

      expect(result).toBe(0);
    });
  });

  describe('Integration: Complex Query Patterns', () => {
    it('should build paginated, sorted, filtered query', async () => {
      const selectMock = jest.fn(() => mockQuery);
      mockSupabaseClient.from = jest.fn(() => ({
        select: selectMock,
      })) as any;

      // Simulate building a complex query
      let query = service.testBuildSelectQuery('*');
      query = service.testApplyStatusFilter(query, 'open');
      query = service.testApplySorting(query, 'name', 'asc');
      query = service.testApplyPagination(query, 2, 25);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'open');
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(mockQuery.range).toHaveBeenCalledWith(25, 49);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', () => {
      service.testApplyPagination(mockQuery, 1000, 10);

      expect(mockQuery.range).toHaveBeenCalledWith(9990, 9999);
    });

    it('should handle page size of 1', () => {
      service.testApplyPagination(mockQuery, 1, 1);

      expect(mockQuery.range).toHaveBeenCalledWith(0, 0);
    });

    it('should handle empty string status filter', () => {
      service.testApplyStatusFilter(mockQuery, '');

      // Empty string is falsy, should not apply filter
      expect(mockQuery.eq).not.toHaveBeenCalled();
    });
  });
});
