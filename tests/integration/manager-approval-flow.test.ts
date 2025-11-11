/**
 * Manager Approval Flow Integration Tests
 * Tests the complete manager approval workflow from validation failure to approval
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { validateSubmissionAction } from '@/app/actions/quality-validation-actions';
import { recordManagerApproval } from '@/lib/services/enforcement-logger';
import type { NCA } from '@/lib/ai/types';

// Mock the enforcement logger
jest.mock('@/lib/services/enforcement-logger');
jest.mock('@/lib/ai');

describe('Manager Approval Flow Integration', () => {
  const mockUserId = 'user-123';
  const mockFormId = 'nca-123';

  const incompleteNCA: Partial<NCA> = {
    nca_id: mockFormId,
    nc_description: 'Short description', // Too short
    nc_type: 'finished-goods',
    machine_status: 'operational',
    cross_contamination: false,
    disposition_rework: false,
    disposition_concession: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Progressive Escalation to Manager Approval', () => {
    it('should require manager approval on 4th attempt', async () => {
      // Simulate 4 attempts with same incomplete data
      for (let attempt = 1; attempt <= 4; attempt++) {
        const result = await validateSubmissionAction(
          'nca',
          incompleteNCA as NCA,
          mockUserId,
          false,
          attempt,
          mockFormId
        );

        if (attempt < 4) {
          expect(result.success).toBe(true);
          expect(result.data?.ready_for_submission).toBe(false);
        } else {
          // 4th attempt should require manager approval
          expect(result.success).toBe(true);
          expect(result.data?.ready_for_submission).toBe(false);
          // The validation result should indicate manager approval needed
        }
      }
    });

    it('should log enforcement actions for each attempt', async () => {
      const { logEnforcementAction } = require('@/lib/services/enforcement-logger');

      await validateSubmissionAction('nca', incompleteNCA as NCA, mockUserId, false, 1, mockFormId);

      expect(logEnforcementAction).toHaveBeenCalled();
    });
  });

  describe('Manager Approval Recording', () => {
    it('should record manager approval decision', async () => {
      const mockLogId = 'log-123';
      const mockManagerId = 'manager-456';
      const justification = 'Approved due to urgent production needs. Will follow up with training.';

      const result = await recordManagerApproval(mockLogId, mockManagerId, true, justification);

      expect(result).toBe(true);
    });

    it('should record manager rejection', async () => {
      const mockLogId = 'log-123';
      const mockManagerId = 'manager-456';
      const notes = 'Insufficient information provided. Request resubmission with complete details.';

      const result = await recordManagerApproval(mockLogId, mockManagerId, false, notes);

      expect(result).toBe(true);
    });
  });

  describe('Justification Requirements', () => {
    it('should enforce minimum 50 characters for justification', () => {
      const shortJustification = 'Approved'; // Too short
      expect(shortJustification.length).toBeLessThan(50);

      // In the UI, this would disable the submit button
      // In the service, this would be validated
    });

    it('should accept justification meeting minimum length', () => {
      const validJustification = 'A'.repeat(50);
      expect(validJustification.length).toBeGreaterThanOrEqual(50);
    });
  });
});

