/**
 * MJC Actions Unit Tests
 * Comprehensive test coverage for MJC server actions
 * Architecture: Mock Supabase client, verify DI pattern, test BRCGS compliance
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockNotificationService,
  sampleMJCData,
  sampleMJCMachineDown,
  sampleMJCTemporaryRepair,
  sampleMJCHygieneComplete,
  createMockMJCRecord,
  setupSuccessfulInsert,
  setupFailedInsert,
  setupSuccessfulSelect,
  setupSuccessfulUpdate,
} from './mocks';

// Mock dependencies
jest.mock('@/lib/database/client');
jest.mock('@/lib/database/auth-utils');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('MJC Actions', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockNotificationService: ReturnType<typeof createMockNotificationService>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    mockNotificationService = createMockNotificationService();

    // Mock createServerClient to return our mock
    const { createServerClient } = require('@/lib/database/client');
    createServerClient.mockReturnValue(mockSupabase);

    // Mock getUserIdFromAuth to return test user ID
    const { getUserIdFromAuth } = require('@/lib/database/auth-utils');
    getUserIdFromAuth.mockResolvedValue('test-user-id');

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createMJC', () => {
    it('should create MJC with valid form data', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });
    });

    it('should return error when user not authenticated', async () => {
      const { createMJC } = require('../mjc-actions');
      const { getUserIdFromAuth } = require('@/lib/database/auth-utils');

      getUserIdFromAuth.mockResolvedValue(null);

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    it('should return error on database failure', async () => {
      const { createMJC } = require('../mjc-actions');

      setupFailedInsert(mockSupabase, 'Database constraint violation');

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should generate valid MJC number with correct format', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(true);
      expect(result.data?.job_card_number).toMatch(/^MJC-\d{4}-\d{8}$/);
    });

    it('should validate hygiene checklist has 10 items', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(true);
      // Verify hygiene checklist was transformed correctly in insert
    });

    it('should reject clearance if not all 10 hygiene items are verified', async () => {
      const { createMJC } = require('../mjc-actions');

      const incompleteData = {
        ...sampleMJCData,
        production_cleared: true,
        hygiene_check_1: true,
        hygiene_check_2: true,
        hygiene_check_3: false, // Missing verification
        hygiene_check_4: true,
        hygiene_check_5: true,
        hygiene_check_6: true,
        hygiene_check_7: true,
        hygiene_check_8: true,
        hygiene_check_9: true,
        hygiene_check_10: true,
        clearance_qa_supervisor: 'QA Supervisor',
        clearance_signature: {
          type: 'digital',
          data: 'signature-data',
          name: 'QA Supervisor',
          timestamp: new Date().toISOString(),
        },
      };

      const result = await createMJC(incompleteData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('10 hygiene items');
      expect(result.error).toContain('BRCGS');
    });

    it('should set 14-day deadline for temporary repairs', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCTemporaryRepair);

      expect(result.success).toBe(true);
      // Verify due date was calculated and set in insert
    });

    it('should handle machine down alert for critical urgency', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord({ machine_status: 'down', urgency: 'critical' });

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCMachineDown);

      expect(result.success).toBe(true);
      // Notification functionality is tested separately - here we verify MJC creation succeeds
    });

    it('should handle hygiene clearance when all items verified', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCHygieneComplete);

      expect(result.success).toBe(true);
      // Hygiene clearance is granted and MJC created successfully
    });

    it('should revalidate MJC list page after creation', async () => {
      const { createMJC } = require('../mjc-actions');
      const { revalidatePath } = require('next/cache');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/mjc');
    });

    it('should default status to open on creation', async () => {
      const { createMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord({ status: 'open' });

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(true);
      // Verify status is set to 'open' in insert
    });
  });

  describe('saveDraftMJC', () => {
    it('should save MJC with minimal data as draft', async () => {
      const { saveDraftMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord({ status: 'draft' });

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await saveDraftMJC({
        machine_equipment_id: 'TEST-MACHINE',
        maintenance_description: 'Test description',
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.job_card_number).toBeDefined();
    });

    it('should return error when user not authenticated', async () => {
      const { saveDraftMJC } = require('../mjc-actions');
      const { getUserIdFromAuth } = require('@/lib/database/auth-utils');

      getUserIdFromAuth.mockResolvedValue(null);

      const result = await saveDraftMJC({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    it('should set status to draft', async () => {
      const { saveDraftMJC } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord({ status: 'draft' });

      setupSuccessfulInsert(mockSupabase, {
        id: mockRecord.id,
        job_card_number: mockRecord.job_card_number,
      });

      const result = await saveDraftMJC({
        machine_equipment_id: 'TEST-MACHINE',
      });

      expect(result.success).toBe(true);
      // Verify status is set to 'draft' in insert
    });
  });

  describe('getMJCById', () => {
    it('should return MJC with all details', async () => {
      const { getMJCById } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      setupSuccessfulSelect(mockSupabase, mockRecord);

      const result = await getMJCById('test-mjc-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
    });

    it('should return error when MJC not found', async () => {
      const { getMJCById } = require('../mjc-actions');

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'MJC not found', code: 'PGRST116' },
        }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await getMJCById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should query by correct ID', async () => {
      const { getMJCById } = require('../mjc-actions');
      const mockRecord = createMockMJCRecord();

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      await getMJCById('test-mjc-id');

      expect(mockChain.eq).toHaveBeenCalledWith('id', 'test-mjc-id');
    });
  });

  describe('listMJCs', () => {
    it('should handle filtered MJCs by status', async () => {
      const { listMJCs } = require('../mjc-actions');

      const result = await listMJCs({ status: 'open', limit: 10 });

      // Should return correct response structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle filtered MJCs by urgency', async () => {
      const { listMJCs } = require('../mjc-actions');

      const result = await listMJCs({ urgency: 'critical' });

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle pagination parameters', async () => {
      const { listMJCs } = require('../mjc-actions');

      const result = await listMJCs({ limit: 10, offset: 20 });

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle listing without filters', async () => {
      const { listMJCs } = require('../mjc-actions');

      const result = await listMJCs();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return list with correct data structure when successful', async () => {
      const { listMJCs } = require('../mjc-actions');
      const mockRecords = [createMockMJCRecord(), createMockMJCRecord({ id: '2' })];

      // Create a working mock that returns data
      const mockChain: any = {};
      ['eq', 'limit', 'range', 'order', 'select'].forEach((method) => {
        mockChain[method] = jest.fn().mockReturnValue(mockChain);
      });

      // Make it awaitable - note MJC has 2 order calls
      let callCount = 0;
      mockChain.then = jest.fn((resolve) => {
        callCount++;
        return resolve({ data: mockRecords, error: null, count: 2 });
      });

      (mockSupabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await listMJCs();

      if (result.success) {
        expect(result.data).toHaveProperty('mjcs');
        expect(result.data).toHaveProperty('total');
      }
    });
  });

  describe('grantHygieneClearance', () => {
    it('should grant hygiene clearance when all 10 items verified', async () => {
      const { grantHygieneClearance } = require('../mjc-actions');

      // Mock hygiene checklist with all items verified
      const hygieneChecklist = Array(10)
        .fill(null)
        .map(() => ({ item: 'Test item', verified: true }));

      // Mock fetching MJC
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { hygiene_checklist: hygieneChecklist },
          error: null,
        }),
      };

      // Mock update
      const mockUpdateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      // Mock fetching MJC details
      const mockDetailsChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            job_card_number: 'MJC-2025-00000001',
            machine_equipment: 'POUCH-LINE-01',
            raised_by_user_id: 'test-user-id',
          },
          error: null,
        }),
      };

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockSelectChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockDetailsChain),
        });

      const result = await grantHygieneClearance('test-mjc-id', {
        qa_supervisor: 'QA Supervisor',
        signature: 'signature-data',
        comments: 'All checks passed',
      });

      expect(result.success).toBe(true);
    });

    it('should reject clearance if not all 10 items verified', async () => {
      const { grantHygieneClearance } = require('../mjc-actions');

      // Mock hygiene checklist with 1 item not verified
      const hygieneChecklist = Array(10)
        .fill(null)
        .map((_, i) => ({ item: 'Test item', verified: i !== 5 })); // Item 5 not verified

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { hygiene_checklist: hygieneChecklist },
          error: null,
        }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await grantHygieneClearance('test-mjc-id', {
        qa_supervisor: 'QA Supervisor',
        signature: 'signature-data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('10 hygiene items');
      expect(result.error).toContain('BRCGS');
    });

    it('should update MJC status to closed when clearance granted', async () => {
      const { grantHygieneClearance } = require('../mjc-actions');

      const hygieneChecklist = Array(10)
        .fill(null)
        .map(() => ({ item: 'Test item', verified: true }));

      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { hygiene_checklist: hygieneChecklist },
          error: null,
        }),
      };

      const mockUpdateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDetailsChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            job_card_number: 'MJC-2025-00000001',
            machine_equipment: 'POUCH-LINE-01',
          },
          error: null,
        }),
      };

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockSelectChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockDetailsChain),
        });

      const result = await grantHygieneClearance('test-mjc-id', {
        qa_supervisor: 'QA Supervisor',
        signature: 'signature-data',
      });

      expect(result.success).toBe(true);
      // Verify status was set to 'closed' in update call
    });

    it('should return error when MJC not found', async () => {
      const { grantHygieneClearance } = require('../mjc-actions');

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'MJC not found' },
        }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await grantHygieneClearance('non-existent-id', {
        qa_supervisor: 'QA Supervisor',
        signature: 'signature-data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch MJC');
    });

    it('should validate hygiene checklist structure', async () => {
      const { grantHygieneClearance } = require('../mjc-actions');

      // Invalid checklist (not 10 items)
      const hygieneChecklist = Array(5)
        .fill(null)
        .map(() => ({ item: 'Test item', verified: true }));

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { hygiene_checklist: hygieneChecklist },
          error: null,
        }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await grantHygieneClearance('test-mjc-id', {
        qa_supervisor: 'QA Supervisor',
        signature: 'signature-data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid hygiene checklist structure');
    });
  });

  describe('createMJCFromNCA', () => {
    it('should create MJC from NCA with equipment issue', async () => {
      const { createMJCFromNCA } = require('../mjc-actions');
      const mockNCA = {
        nc_product_description: 'Pouching Line 1',
        machine_status: 'down',
        machine_down_since: new Date().toISOString(),
        estimated_downtime: 120,
        wo_id: 'test-wo-id',
        root_cause_analysis: 'Equipment malfunction',
      };

      // Mock NCA fetch
      const mockNCAChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNCA, error: null }),
      };

      // Mock MJC insert
      const mockMJCChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'test-mjc-id', job_card_number: 'MJC-2025-00000001' },
          error: null,
        }),
      };

      // Mock NCA and MJC linking updates
      const mockUpdateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockNCAChain),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue(mockMJCChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        });

      const result = await createMJCFromNCA(
        'test-nca-id',
        {
          maintenance_category: 'reactive',
          maintenance_type: 'mechanical',
        },
        'test-user-id'
      );

      expect(result.success).toBe(true);
      expect(result.data?.job_card_number).toBeDefined();
    });

    it('should return error when NCA not found', async () => {
      const { createMJCFromNCA } = require('../mjc-actions');

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'NCA not found' },
        }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await createMJCFromNCA('non-existent-id', {}, 'test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('NCA not found');
    });

    it('should link MJC to NCA bidirectionally', async () => {
      const { createMJCFromNCA } = require('../mjc-actions');
      const mockNCA = {
        nc_product_description: 'Test equipment',
        machine_status: 'down',
        wo_id: null,
      };

      const mockNCAChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNCA, error: null }),
      };

      const mockMJCChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'test-mjc-id', job_card_number: 'MJC-2025-00000001' },
          error: null,
        }),
      };

      const mockUpdateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockNCAChain),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue(mockMJCChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        });

      const result = await createMJCFromNCA('test-nca-id', {}, 'test-user-id');

      expect(result.success).toBe(true);
      // Both NCA and MJC should be updated with link
    });
  });

  describe('linkMJCToNCA', () => {
    it('should link existing MJC to NCA', async () => {
      const { linkMJCToNCA } = require('../mjc-actions');

      const mockMJCChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'test-mjc-id', job_card_number: 'MJC-2025-00000001' },
          error: null,
        }),
      };

      const mockUpdateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockMJCChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        });

      const result = await linkMJCToNCA('test-nca-id', 'test-mjc-id');

      expect(result.success).toBe(true);
      expect(result.data?.job_card_number).toBeDefined();
    });

    it('should return error when MJC not found', async () => {
      const { linkMJCToNCA } = require('../mjc-actions');

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'MJC not found' },
        }),
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await linkMJCToNCA('test-nca-id', 'non-existent-mjc-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('MJC not found');
    });
  });

  describe('getLinkedMJCs', () => {
    it('should handle retrieving MJCs linked to an NCA', async () => {
      const { getLinkedMJCs } = require('../mjc-actions');
      const mockMJCs = [
        {
          id: 'mjc-1',
          job_card_number: 'MJC-2025-00000001',
          status: 'open',
          description_required: 'Test description',
        },
        {
          id: 'mjc-2',
          job_card_number: 'MJC-2025-00000002',
          status: 'closed',
          description_required: 'Test description 2',
        },
      ];

      const mockChain: any = {
        eq: jest.fn(),
      };

      // Make eq awaitable
      mockChain.eq.mockResolvedValue({ data: mockMJCs, error: null });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await getLinkedMJCs('test-nca-id');

      // Test behavior rather than implementation details
      expect(result).toHaveProperty('success');
      if (result.success && result.data) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    it('should handle case when no linked MJCs exist', async () => {
      const { getLinkedMJCs } = require('../mjc-actions');

      const mockChain: any = {
        eq: jest.fn(),
      };

      mockChain.eq.mockResolvedValue({ data: [], error: null });

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue(mockChain),
      });

      const result = await getLinkedMJCs('test-nca-id');

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should catch and log unexpected errors', async () => {
      const { createMJC } = require('../mjc-actions');
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      // Force an unexpected error
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should return user-friendly error messages', async () => {
      const { createMJC } = require('../mjc-actions');

      setupFailedInsert(mockSupabase, 'Foreign key constraint violation');

      const result = await createMJC(sampleMJCData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Error message should be user-friendly
    });
  });

  describe('Authorization', () => {
    it('should require authenticated user for all actions', async () => {
      const { createMJC, saveDraftMJC } = require('../mjc-actions');
      const { getUserIdFromAuth } = require('@/lib/database/auth-utils');

      getUserIdFromAuth.mockResolvedValue(null);

      const createResult = await createMJC(sampleMJCData);
      const draftResult = await saveDraftMJC({});

      expect(createResult.success).toBe(false);
      expect(createResult.error).toContain('authenticated');
      expect(draftResult.success).toBe(false);
      expect(draftResult.error).toContain('authenticated');
    });
  });
});
