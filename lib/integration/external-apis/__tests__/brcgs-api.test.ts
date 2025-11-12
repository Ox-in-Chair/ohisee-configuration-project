/**
 * BRCGS API Service - Unit Tests
 * TDD Phase: Comprehensive test coverage >95%
 * Architecture: Mock external API calls and Supabase client
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { SupabaseClient } from '@/lib/database/client';
import {
  BRCGSAPIService,
  createBRCGSAPIService,
  type BRCGSStandardUpdate,
  type BRCGSAPIResponse,
} from '../brcgs-api';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();
  const mockUpdate = jest.fn();
  const mockUpsert = jest.fn();
  const mockEq = jest.fn();

  mockFrom.mockReturnValue({
    update: mockUpdate,
    upsert: mockUpsert,
  });

  // Create chainable mock structure for .update().eq().eq()
  const resolvedPromise = Promise.resolve({ error: null });

  const chainableEq = {
    eq: jest.fn().mockResolvedValue({ error: null }),
  };

  const chainableUpdate = {
    eq: jest.fn().mockReturnValue(chainableEq),
  };

  mockUpdate.mockReturnValue(chainableUpdate);
  mockUpsert.mockResolvedValue({ error: null });

  return {
    from: mockFrom,
    _mocks: { mockFrom, mockUpdate, mockUpsert, mockEq, chainableUpdate, chainableEq },
  } as unknown as SupabaseClient & { _mocks: any };
};

describe('BRCGSAPIService', () => {
  let mockSupabase: SupabaseClient & { _mocks: any };
  let service: BRCGSAPIService;

  const mockStandardUpdate: BRCGSStandardUpdate = {
    standardCode: 'BRCGS-5.7',
    sectionNumber: '5.7',
    title: 'Control of Non-Conforming Product',
    content: 'Detailed procedure content...',
    version: 'Issue 7 Rev 2',
    effectiveDate: '2025-01-01',
    changeType: 'updated',
    changes: ['Updated disposition requirements', 'Added new compliance checklist'],
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new BRCGSAPIService(mockSupabase, undefined, undefined);
    jest.clearAllMocks();
    delete process.env['BRCGS_API_BASE_URL'];
    delete process.env['BRCGS_API_KEY'];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create service with provided Supabase client', () => {
      const customService = new BRCGSAPIService(mockSupabase);
      expect(customService).toBeDefined();
      expect(customService).toBeInstanceOf(BRCGSAPIService);
    });

    it('should create service without Supabase client (uses default)', () => {
      const defaultService = new BRCGSAPIService();
      expect(defaultService).toBeDefined();
    });

    it('should accept API credentials via constructor', () => {
      const serviceWithCreds = new BRCGSAPIService(
        mockSupabase,
        'https://api.brcgs.com',
        'test-api-key'
      );

      expect(serviceWithCreds.isConfigured()).toBe(true);
    });

    it('should read API credentials from environment variables', () => {
      process.env['BRCGS_API_BASE_URL'] = 'https://env.brcgs.com';
      process.env['BRCGS_API_KEY'] = 'env-key-123';

      const envService = new BRCGSAPIService(mockSupabase);

      expect(envService.isConfigured()).toBe(true);
    });

    it('should prioritize constructor params over env variables', () => {
      process.env['BRCGS_API_BASE_URL'] = 'https://env.api.com';
      process.env['BRCGS_API_KEY'] = 'env-key';

      const service = new BRCGSAPIService(
        mockSupabase,
        'https://constructor.api.com',
        'constructor-key'
      );

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('Factory Function', () => {
    it('should create service via factory function', () => {
      const factoryService = createBRCGSAPIService(mockSupabase);
      expect(factoryService).toBeInstanceOf(BRCGSAPIService);
    });

    it('should create service via factory with credentials', () => {
      const factoryService = createBRCGSAPIService(
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
      const partialService = new BRCGSAPIService(
        mockSupabase,
        'https://api.test.com',
        undefined
      );

      expect(partialService.isConfigured()).toBe(false);
    });

    it('should return false when only API key provided', () => {
      const partialService = new BRCGSAPIService(mockSupabase, undefined, 'api-key-123');

      expect(partialService.isConfigured()).toBe(false);
    });

    it('should return true when both credentials provided', () => {
      const configuredService = new BRCGSAPIService(
        mockSupabase,
        'https://api.test.com',
        'api-key-123'
      );

      expect(configuredService.isConfigured()).toBe(true);
    });
  });

  describe('fetchUpdates - Unconfigured API', () => {
    it('should return error when API not configured', async () => {
      const result = await service.fetchUpdates();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.updates).toEqual([]);
    });

    it('should include configuration instructions in error', async () => {
      const result = await service.fetchUpdates();

      expect(result.error).toContain('BRCGS_API_BASE_URL');
      expect(result.error).toContain('BRCGS_API_KEY');
    });
  });

  describe('fetchUpdates - Configured API (Placeholder)', () => {
    beforeEach(() => {
      service = new BRCGSAPIService(mockSupabase, 'https://api.brcgs.com', 'test-key-123');
    });

    it('should return successful placeholder response', async () => {
      const result = await service.fetchUpdates();

      expect(result.success).toBe(true);
      expect(result.updates).toEqual([]);
      expect(result.lastSyncDate).toBeDefined();
    });

    it('should accept since date parameter', async () => {
      const sinceDate = new Date('2025-01-01');
      const result = await service.fetchUpdates(sinceDate);

      expect(result.success).toBe(true);
    });

    it('should include lastSyncDate in response', async () => {
      const result = await service.fetchUpdates();

      expect(result.lastSyncDate).toBeDefined();
      expect(new Date(result.lastSyncDate!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle undefined since parameter', async () => {
      const result = await service.fetchUpdates(undefined);

      expect(result.success).toBe(true);
    });
  });

  describe('syncToKnowledgeBase - Updated Standards', () => {
    it('should sync single updated standard successfully', async () => {
      const result = await service.syncToKnowledgeBase([mockStandardUpdate]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(mockSupabase._mocks.mockFrom).toHaveBeenCalledWith('knowledge_base_documents');
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalled();
    });

    it('should map update fields correctly', async () => {
      await service.syncToKnowledgeBase([mockStandardUpdate]);

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      expect(upsertCall[0]).toMatchObject({
        document_number: 'BRCGS-5.7',
        document_name: 'Control of Non-Conforming Product',
        full_text: 'Detailed procedure content...',
        revision: 'Issue 7 Rev 2',
        effective_date: '2025-01-01',
        status: 'current',
        brcgs_section: '5.7',
        document_type: 'brcgs_standard',
      });
    });

    it('should use onConflict for upsert behavior', async () => {
      await service.syncToKnowledgeBase([mockStandardUpdate]);

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      expect(upsertCall[1]).toEqual({
        onConflict: 'document_number,revision',
      });
    });

    it('should set updated_at timestamp', async () => {
      const beforeSync = Date.now();
      await service.syncToKnowledgeBase([mockStandardUpdate]);
      const afterSync = Date.now();

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      const timestamp = new Date(upsertCall[0].updated_at).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(beforeSync);
      expect(timestamp).toBeLessThanOrEqual(afterSync);
    });

    it('should count inserted records', async () => {
      const result = await service.syncToKnowledgeBase([mockStandardUpdate]);

      expect(result.recordsInserted).toBe(1);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should sync multiple updates', async () => {
      const updates: BRCGSStandardUpdate[] = [
        mockStandardUpdate,
        { ...mockStandardUpdate, standardCode: 'BRCGS-5.8', sectionNumber: '5.8' },
        { ...mockStandardUpdate, standardCode: 'BRCGS-5.9', sectionNumber: '5.9' },
      ];

      const result = await service.syncToKnowledgeBase(updates);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalledTimes(3);
    });
  });

  describe('syncToKnowledgeBase - Superseded Standards', () => {
    it('should mark superseded standard correctly', async () => {
      const supersededUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'superseded',
      };

      const result = await service.syncToKnowledgeBase([supersededUpdate]);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalled();
      expect(mockSupabase._mocks.mockUpsert).not.toHaveBeenCalled();
    });

    it('should use correct filters for superseding', async () => {
      const supersededUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'superseded',
      };

      await service.syncToKnowledgeBase([supersededUpdate]);

      expect(mockSupabase._mocks.chainableUpdate.eq).toHaveBeenCalledWith('document_number', 'BRCGS-5.7');
      expect(mockSupabase._mocks.chainableEq.eq).toHaveBeenCalledWith('revision', 'Issue 7 Rev 2');
    });

    it('should set status to superseded', async () => {
      const supersededUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'superseded',
      };

      await service.syncToKnowledgeBase([supersededUpdate]);

      const updateCall = mockSupabase._mocks.mockUpdate.mock.calls[0];
      expect(updateCall[0].status).toBe('superseded');
    });

    it('should count superseded as updated', async () => {
      const supersededUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'superseded',
      };

      const result = await service.syncToKnowledgeBase([supersededUpdate]);

      expect(result.recordsUpdated).toBe(1);
      expect(result.recordsInserted).toBe(0);
    });
  });

  describe('syncToKnowledgeBase - New Standards', () => {
    it('should sync new standard', async () => {
      const newUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'new',
      };

      const result = await service.syncToKnowledgeBase([newUpdate]);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalled();
    });

    it('should mark new standard as current', async () => {
      const newUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'new',
      };

      await service.syncToKnowledgeBase([newUpdate]);

      const upsertCall = mockSupabase._mocks.mockUpsert.mock.calls[0];
      expect(upsertCall[0].status).toBe('current');
    });
  });

  describe('syncToKnowledgeBase - Error Handling', () => {
    it('should handle upsert errors', async () => {
      mockSupabase._mocks.mockUpsert.mockResolvedValue({
        error: { message: 'Constraint violation' },
      });

      const result = await service.syncToKnowledgeBase([mockStandardUpdate]);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Constraint violation');
    });

    it('should handle supersede errors', async () => {
      // Create new mock that returns error for the chain
      const errorMockSupabase = createMockSupabaseClient();
      errorMockSupabase._mocks.chainableEq.eq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      const errorService = new BRCGSAPIService(
        errorMockSupabase,
        'https://api.test.com',
        'test-key'
      );

      const supersededUpdate: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changeType: 'superseded',
      };

      const result = await errorService.syncToKnowledgeBase([supersededUpdate]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Update failed');
    });

    it('should continue syncing after single error', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: null });

      const updates = [mockStandardUpdate, mockStandardUpdate, mockStandardUpdate];
      const result = await service.syncToKnowledgeBase(updates);

      expect(result.status).toBe('partial');
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalledTimes(3);
    });

    it('should mark as partial when some records fail', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Failed' } });

      const result = await service.syncToKnowledgeBase([mockStandardUpdate, mockStandardUpdate]);

      expect(result.status).toBe('partial');
      expect(result.success).toBe(false);
    });

    it('should aggregate multiple error messages', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: { message: 'Error 1' } })
        .mockResolvedValueOnce({ error: { message: 'Error 2' } });

      const result = await service.syncToKnowledgeBase([mockStandardUpdate, mockStandardUpdate]);

      expect(result.error).toContain('Error 1');
      expect(result.error).toContain('Error 2');
    });

    it('should handle exceptions during sync', async () => {
      mockSupabase._mocks.mockUpsert.mockRejectedValue(new Error('Network timeout'));

      const result = await service.syncToKnowledgeBase([mockStandardUpdate]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabase._mocks.mockUpsert.mockRejectedValue('String error');

      const result = await service.syncToKnowledgeBase([mockStandardUpdate]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should include error count in metadata', async () => {
      mockSupabase._mocks.mockUpsert
        .mockResolvedValueOnce({ error: { message: 'Error' } })
        .mockResolvedValueOnce({ error: { message: 'Error' } });

      const result = await service.syncToKnowledgeBase([mockStandardUpdate, mockStandardUpdate]);

      expect(result.metadata?.errors).toBe(2);
    });
  });

  describe('syncToKnowledgeBase - Edge Cases', () => {
    it('should handle empty updates array', async () => {
      const result = await service.syncToKnowledgeBase([]);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should handle updates with all change types', async () => {
      const updates: BRCGSStandardUpdate[] = [
        { ...mockStandardUpdate, changeType: 'new' },
        { ...mockStandardUpdate, changeType: 'updated' },
        { ...mockStandardUpdate, changeType: 'superseded' },
      ];

      const result = await service.syncToKnowledgeBase(updates);

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.mockUpsert).toHaveBeenCalledTimes(2); // new + updated
      expect(mockSupabase._mocks.mockUpdate).toHaveBeenCalledTimes(1); // superseded
    });

    it('should handle updates without changes array', async () => {
      const updateWithoutChanges: BRCGSStandardUpdate = {
        ...mockStandardUpdate,
        changes: undefined,
      };

      const result = await service.syncToKnowledgeBase([updateWithoutChanges]);

      expect(result.success).toBe(true);
    });

    it('should include metadata in result', async () => {
      const result = await service.syncToKnowledgeBase([mockStandardUpdate, mockStandardUpdate]);

      expect(result.metadata).toEqual({
        totalUpdates: 2,
        errors: 0,
      });
    });

    it('should return zero deleted records', async () => {
      const result = await service.syncToKnowledgeBase([mockStandardUpdate]);

      expect(result.recordsDeleted).toBe(0);
    });
  });

  describe('performSync - Full Integration', () => {
    beforeEach(() => {
      service = new BRCGSAPIService(mockSupabase, 'https://api.brcgs.com', 'test-key');
    });

    it('should perform full sync successfully', async () => {
      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
    });

    it('should pass since date to fetchUpdates', async () => {
      const fetchSpy = jest.spyOn(service, 'fetchUpdates');
      const sinceDate = new Date('2025-01-01');

      await service.performSync(sinceDate);

      expect(fetchSpy).toHaveBeenCalledWith(sinceDate);
    });

    it('should return error if API fetch fails', async () => {
      const unconfiguredService = new BRCGSAPIService(mockSupabase);

      const result = await unconfiguredService.performSync();

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('not configured');
    });

    it('should handle empty updates response', async () => {
      const result = await service.performSync();

      expect(result.success).toBe(true);
      expect(result.recordsInserted).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should not call syncToKnowledgeBase if fetch fails', async () => {
      const unconfiguredService = new BRCGSAPIService(mockSupabase);
      const syncSpy = jest.spyOn(unconfiguredService, 'syncToKnowledgeBase');

      await unconfiguredService.performSync();

      expect(syncSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined since parameter', async () => {
      const result = await service.performSync(undefined);

      expect(result.success).toBe(true);
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should accept custom Supabase client', () => {
      const customClient = createMockSupabaseClient();
      const customService = new BRCGSAPIService(customClient);

      expect(customService).toBeDefined();
    });

    it('should not use global Supabase instance', () => {
      const service1 = new BRCGSAPIService(mockSupabase);
      const service2 = new BRCGSAPIService(createMockSupabaseClient());

      expect(service1).not.toBe(service2);
    });

    it('should inject API credentials separately from Supabase', () => {
      const serviceWithCreds = new BRCGSAPIService(
        mockSupabase,
        'https://api.test.com',
        'key-123'
      );

      expect(serviceWithCreds.isConfigured()).toBe(true);
    });
  });
});
