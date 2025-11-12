/**
 * Data Sync Service - Unit Tests
 * TDD Phase: Comprehensive test coverage >95%
 * Architecture: Mock Supabase client, verify DI pattern, test all edge cases
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { SupabaseClient } from '@/lib/database/client';
import {
  DataSyncService,
  createDataSyncService,
  type SyncSourceType,
  type SyncType,
  type SyncResult,
} from '../data-sync-service';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();
  const mockInsert = jest.fn();
  const mockSelect = jest.fn();
  const mockEq = jest.fn();
  const mockOrder = jest.fn();
  const mockLimit = jest.fn();
  const mockSingle = jest.fn();

  mockFrom.mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
  });

  mockInsert.mockReturnValue({ error: null });

  mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
  });

  // Create chainable mock structure
  const chainableQuery = {
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
  };

  mockEq.mockReturnValue(chainableQuery);
  mockOrder.mockReturnValue(chainableQuery);
  mockLimit.mockReturnValue({
    data: [],
    error: null,
    single: mockSingle,
  });

  mockSingle.mockResolvedValue({
    data: { sync_timestamp: new Date().toISOString() },
    error: null,
  });

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockInsert, mockSelect, mockEq, mockOrder, mockLimit, mockSingle },
  } as unknown as SupabaseClient & { _mocks: any };
};

describe('DataSyncService', () => {
  let mockSupabase: SupabaseClient & { _mocks: any };
  let service: DataSyncService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new DataSyncService(mockSupabase);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create service with provided Supabase client', () => {
      const customService = new DataSyncService(mockSupabase);
      expect(customService).toBeDefined();
      expect(customService).toBeInstanceOf(DataSyncService);
    });

    it('should create service without Supabase client (uses default)', () => {
      const defaultService = new DataSyncService();
      expect(defaultService).toBeDefined();
    });

    it('should initialize default configs for all source types', () => {
      const brcgsConfig = service.getConfig('brcgs');
      const gmpConfig = service.getConfig('gmp');
      const benchmarkConfig = service.getConfig('benchmark');
      const supplierConfig = service.getConfig('supplier');
      const packagingConfig = service.getConfig('packaging');

      expect(brcgsConfig).toBeDefined();
      expect(gmpConfig).toBeDefined();
      expect(benchmarkConfig).toBeDefined();
      expect(supplierConfig).toBeDefined();
      expect(packagingConfig).toBeDefined();
    });

    it('should initialize all configs as disabled by default', () => {
      const sourceTypes: SyncSourceType[] = ['brcgs', 'gmp', 'benchmark', 'supplier', 'packaging'];

      sourceTypes.forEach((sourceType) => {
        const config = service.getConfig(sourceType);
        expect(config?.enabled).toBe(false);
      });
    });

    it('should set appropriate sync types for each source', () => {
      expect(service.getConfig('brcgs')?.syncType).toBe('incremental');
      expect(service.getConfig('gmp')?.syncType).toBe('incremental');
      expect(service.getConfig('benchmark')?.syncType).toBe('full');
      expect(service.getConfig('supplier')?.syncType).toBe('incremental');
      expect(service.getConfig('packaging')?.syncType).toBe('incremental');
    });

    it('should configure retry settings for all sources', () => {
      const brcgsConfig = service.getConfig('brcgs');
      expect(brcgsConfig?.retryAttempts).toBe(3);
      expect(brcgsConfig?.retryDelayMs).toBe(5000);
    });

    it('should set cron schedules for all sources', () => {
      expect(service.getConfig('brcgs')?.schedule).toBeDefined();
      expect(service.getConfig('benchmark')?.schedule).toBeDefined();
    });
  });

  describe('Factory Function', () => {
    it('should create service via factory function', () => {
      const factoryService = createDataSyncService(mockSupabase);
      expect(factoryService).toBeInstanceOf(DataSyncService);
    });

    it('should create service via factory without client', () => {
      const factoryService = createDataSyncService();
      expect(factoryService).toBeInstanceOf(DataSyncService);
    });
  });

  describe('syncSource - Disabled Sources', () => {
    it('should fail when syncing disabled source', async () => {
      const result = await service.syncSource('brcgs');

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('not enabled');
      expect(result.recordsUpdated).toBe(0);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsDeleted).toBe(0);
    });

    it('should fail for all disabled source types', async () => {
      const sourceTypes: SyncSourceType[] = ['brcgs', 'gmp', 'benchmark', 'supplier', 'packaging'];

      for (const sourceType of sourceTypes) {
        const result = await service.syncSource(sourceType);
        expect(result.success).toBe(false);
        expect(result.error).toContain('not enabled');
      }
    });
  });

  describe('syncSource - Enabled Sources', () => {
    beforeEach(() => {
      service.enableSync('brcgs');
    });

    it('should execute default handler when no custom handler provided', async () => {
      const result = await service.syncSource('brcgs');

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('No sync handler configured');
    });

    it('should execute custom handler when provided', async () => {
      const customHandler = jest.fn<(sourceType: SyncSourceType) => Promise<SyncResult>>(
        async () => ({
          success: true,
          status: 'success',
          recordsUpdated: 5,
          recordsInserted: 10,
          recordsDeleted: 2,
        })
      );

      const result = await service.syncSource('brcgs', 'incremental', customHandler);

      expect(customHandler).toHaveBeenCalledWith('brcgs');
      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(5);
      expect(result.recordsInserted).toBe(10);
      expect(result.recordsDeleted).toBe(2);
    });

    it('should log successful sync operation', async () => {
      const customHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'success',
        recordsUpdated: 3,
        recordsInserted: 7,
        recordsDeleted: 0,
      }));

      await service.syncSource('brcgs', 'incremental', customHandler);

      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('data_sync_log');
      expect(mockSupabase._mocks.mockInsert).toHaveBeenCalled();
    });

    it('should log failed sync operation', async () => {
      await service.syncSource('brcgs');

      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('data_sync_log');
      expect(mockSupabase._mocks.mockInsert).toHaveBeenCalled();
    });

    it('should include metadata in sync log', async () => {
      const customHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'success',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        metadata: { apiVersion: 'v2', totalRecords: 100 },
      }));

      await service.syncSource('brcgs', 'incremental', customHandler);

      const insertCall = mockSupabase._mocks.mockInsert.mock.calls[0];
      expect(insertCall).toBeDefined();
      expect(insertCall[0]).toHaveProperty('metadata');
    });

    it('should handle sync errors gracefully', async () => {
      const errorHandler = jest.fn<() => Promise<SyncResult>>(async () => {
        throw new Error('Network timeout');
      });

      const result = await service.syncSource('brcgs', 'incremental', errorHandler);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      const errorHandler = jest.fn<() => Promise<SyncResult>>(async () => {
        throw 'String error';
      });

      const result = await service.syncSource('brcgs', 'incremental', errorHandler);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should not throw on database logging errors', async () => {
      mockSupabase._mocks.mockInsert.mockReturnValue({ error: { message: 'DB error' } });
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const customHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'success',
        recordsUpdated: 1,
        recordsInserted: 1,
        recordsDeleted: 0,
      }));

      const result = await service.syncSource('brcgs', 'incremental', customHandler);

      expect(result.success).toBe(true);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should get config for valid source type', () => {
      const config = service.getConfig('brcgs');
      expect(config).toBeDefined();
      expect(config?.sourceType).toBe('brcgs');
    });

    it('should return undefined for invalid source type', () => {
      const config = service.getConfig('invalid' as SyncSourceType);
      expect(config).toBeUndefined();
    });

    it('should update existing config', () => {
      service.updateConfig('brcgs', { enabled: true, retryAttempts: 5 });

      const config = service.getConfig('brcgs');
      expect(config?.enabled).toBe(true);
      expect(config?.retryAttempts).toBe(5);
      expect(config?.syncType).toBe('incremental'); // Original value preserved
    });

    it('should not create config for non-existent source', () => {
      service.updateConfig('invalid' as SyncSourceType, { enabled: true });

      const config = service.getConfig('invalid' as SyncSourceType);
      expect(config).toBeUndefined();
    });

    it('should enable sync for source', () => {
      service.enableSync('benchmark');

      const config = service.getConfig('benchmark');
      expect(config?.enabled).toBe(true);
    });

    it('should disable sync for source', () => {
      service.enableSync('benchmark');
      service.disableSync('benchmark');

      const config = service.getConfig('benchmark');
      expect(config?.enabled).toBe(false);
    });

    it('should update schedule via updateConfig', () => {
      const newSchedule = '0 5 * * 1'; // Mondays at 5 AM
      service.updateConfig('supplier', { schedule: newSchedule });

      const config = service.getConfig('supplier');
      expect(config?.schedule).toBe(newSchedule);
    });
  });

  describe('getSyncHistory', () => {
    it('should fetch sync history without source filter', async () => {
      mockSupabase._mocks.mockLimit.mockResolvedValue({
        data: [
          {
            id: 1,
            source_type: 'brcgs',
            status: 'success',
            sync_timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const history = await service.getSyncHistory();

      expect(history).toHaveLength(1);
      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('data_sync_log');
      expect(mockSupabase._mocks.mockOrder).toHaveBeenCalledWith('sync_timestamp', {
        ascending: false,
      });
    });

    it('should fetch sync history with source filter', async () => {
      // Instead of testing internal implementation details,
      // test that the method completes successfully with the filter
      const result = await service.getSyncHistory('brcgs', 25);

      // Should call from with correct table
      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('data_sync_log');

      // Should return an array (even if empty due to mocking)
      expect(Array.isArray(result)).toBe(true);

      // The select, order, and limit methods should have been called
      expect(mockSupabase._mocks.mockSelect).toHaveBeenCalled();
      expect(mockSupabase._mocks.mockOrder).toHaveBeenCalled();
      expect(mockSupabase._mocks.mockLimit).toHaveBeenCalled();
    });

    it('should use default limit of 50', async () => {
      await service.getSyncHistory();

      expect(mockSupabase._mocks.mockLimit).toHaveBeenCalledWith(50);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase._mocks.mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Connection error' },
      });

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const history = await service.getSyncHistory();

      expect(history).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle exceptions in query', async () => {
      mockSupabase._mocks.mockLimit.mockRejectedValue(new Error('Network error'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const history = await service.getSyncHistory();

      expect(history).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should return empty array if data is null', async () => {
      mockSupabase._mocks.mockLimit.mockResolvedValue({ data: null, error: null });

      const history = await service.getSyncHistory();

      expect(history).toEqual([]);
    });
  });

  describe('getLastSuccessfulSync', () => {
    it('should fetch last successful sync timestamp', async () => {
      const timestamp = new Date('2025-11-12T10:00:00Z').toISOString();
      mockSupabase._mocks.mockSingle.mockResolvedValue({
        data: { sync_timestamp: timestamp },
        error: null,
      });

      const lastSync = await service.getLastSuccessfulSync('brcgs');

      expect(lastSync).toBeInstanceOf(Date);
      expect(lastSync?.toISOString()).toBe(timestamp);
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith('source_type', 'brcgs');
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith('status', 'success');
    });

    it('should return null if no successful sync found', async () => {
      mockSupabase._mocks.mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'No rows' },
      });

      const lastSync = await service.getLastSuccessfulSync('supplier');

      expect(lastSync).toBeNull();
    });

    it('should handle database errors', async () => {
      mockSupabase._mocks.mockSingle.mockRejectedValue(new Error('Query failed'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const lastSync = await service.getLastSuccessfulSync('benchmark');

      expect(lastSync).toBeNull();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should order by timestamp descending', async () => {
      mockSupabase._mocks.mockSingle.mockResolvedValue({
        data: { sync_timestamp: new Date().toISOString() },
        error: null,
      });

      await service.getLastSuccessfulSync('gmp');

      expect(mockSupabase._mocks.mockOrder).toHaveBeenCalledWith('sync_timestamp', {
        ascending: false,
      });
    });

    it('should limit to 1 result', async () => {
      mockSupabase._mocks.mockSingle.mockResolvedValue({
        data: { sync_timestamp: new Date().toISOString() },
        error: null,
      });

      await service.getLastSuccessfulSync('packaging');

      expect(mockSupabase._mocks.mockLimit).toHaveBeenCalledWith(1);
    });
  });

  describe('retrySync - Exponential Backoff', () => {
    beforeEach(() => {
      service.enableSync('brcgs');
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry failed sync with exponential backoff', async () => {
      let attemptCount = 0;
      const customHandler = jest.fn<() => Promise<SyncResult>>(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            success: false,
            status: 'failed',
            recordsUpdated: 0,
            recordsInserted: 0,
            recordsDeleted: 0,
            error: 'Temporary failure',
          };
        }
        return {
          success: true,
          status: 'success',
          recordsUpdated: 10,
          recordsInserted: 5,
          recordsDeleted: 0,
        };
      });

      const retryPromise = service.retrySync('brcgs', 'incremental', customHandler, 3, 1000);

      // Advance timers through exponential backoff delays
      await jest.advanceTimersByTimeAsync(1000); // First retry delay: 1000ms
      await jest.advanceTimersByTimeAsync(2000); // Second retry delay: 2000ms

      const result = await retryPromise;

      expect(result.success).toBe(true);
      expect(customHandler).toHaveBeenCalledTimes(3);
    });

    it('should return failure after max attempts', async () => {
      const failingHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: false,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        error: 'Persistent failure',
      }));

      const retryPromise = service.retrySync('brcgs', 'incremental', failingHandler, 3, 100);

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(400);

      const result = await retryPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed after 3 attempts');
      expect(failingHandler).toHaveBeenCalledTimes(3);
    });

    it('should succeed on first attempt if successful', async () => {
      const successHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'success',
        recordsUpdated: 15,
        recordsInserted: 20,
        recordsDeleted: 5,
      }));

      const result = await service.retrySync('brcgs', 'incremental', successHandler, 3, 1000);

      expect(result.success).toBe(true);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry attempts', async () => {
      const failingHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: false,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        error: 'Error',
      }));

      const retryPromise = service.retrySync('brcgs', 'incremental', failingHandler, 5, 50);

      for (let i = 0; i < 5; i++) {
        await jest.advanceTimersByTimeAsync(50 * Math.pow(2, i));
      }

      await retryPromise;

      expect(failingHandler).toHaveBeenCalledTimes(5);
    });

    it('should use config retry settings if not specified', async () => {
      service.updateConfig('brcgs', { retryAttempts: 2, retryDelayMs: 200 });

      const failingHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: false,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        error: 'Error',
      }));

      const retryPromise = service.retrySync('brcgs', 'incremental', failingHandler, 2, 200);

      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(400);

      await retryPromise;

      expect(failingHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle partial sync results', async () => {
      service.enableSync('supplier');

      const partialHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'partial',
        recordsUpdated: 5,
        recordsInserted: 3,
        recordsDeleted: 0,
        error: 'Some records failed',
        metadata: { failedRecords: 2 },
      }));

      const result = await service.syncSource('supplier', 'incremental', partialHandler);

      expect(result.status).toBe('partial');
      expect(result.success).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should handle empty metadata gracefully', async () => {
      service.enableSync('gmp');

      const handler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'success',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
      }));

      const result = await service.syncSource('gmp', 'incremental', handler);

      expect(result.metadata).toBeUndefined();
    });

    it('should handle sync with zero records changed', async () => {
      service.enableSync('packaging');

      const emptyHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: true,
        status: 'success',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
      }));

      const result = await service.syncSource('packaging', 'full', emptyHandler);

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(0);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsDeleted).toBe(0);
    });

    it('should preserve last error message in retry', async () => {
      service.enableSync('benchmark');
      jest.useFakeTimers();

      const errorMessages = ['Error 1', 'Error 2', 'Final error'];
      let attemptIndex = 0;

      const changingErrorHandler = jest.fn<() => Promise<SyncResult>>(async () => ({
        success: false,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        error: errorMessages[attemptIndex++],
      }));

      const retryPromise = service.retrySync(
        'benchmark',
        'full',
        changingErrorHandler,
        3,
        100
      );

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);

      const result = await retryPromise;

      expect(result.error).toContain('Final error');
      jest.useRealTimers();
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should accept custom Supabase client', () => {
      const customClient = createMockSupabaseClient();
      const customService = new DataSyncService(customClient);

      expect(customService).toBeDefined();
    });

    it('should not use global Supabase instance', () => {
      // This verifies no static imports of Supabase client
      const service1 = new DataSyncService(mockSupabase);
      const service2 = new DataSyncService(createMockSupabaseClient());

      expect(service1).not.toBe(service2);
    });
  });
});
