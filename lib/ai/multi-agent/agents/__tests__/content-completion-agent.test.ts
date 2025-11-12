/**
 * Content Completion Agent Unit Tests
 * Comprehensive test coverage for missing content identification
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ContentCompletionAgent } from '../content-completion-agent';
import type { NCA, MJC, User } from '../../../types';
import type { AgentResult } from '../../types';

// Mock quality enforcement service
jest.mock('@/lib/services/quality-enforcement-service', () => ({
  validateDescriptionCompleteness: jest.fn(),
  validateRootCauseDepth: jest.fn(),
  validateCorrectiveActionSpecificity: jest.fn(),
}));

import * as qualityEnforcementService from '@/lib/services/quality-enforcement-service';

const validateDescriptionCompleteness = qualityEnforcementService.validateDescriptionCompleteness as jest.MockedFunction<typeof qualityEnforcementService.validateDescriptionCompleteness>;
const validateRootCauseDepth = qualityEnforcementService.validateRootCauseDepth as jest.MockedFunction<typeof qualityEnforcementService.validateRootCauseDepth>;
const validateCorrectiveActionSpecificity = qualityEnforcementService.validateCorrectiveActionSpecificity as jest.MockedFunction<typeof qualityEnforcementService.validateCorrectiveActionSpecificity>;

describe('ContentCompletionAgent', () => {
  let agent: ContentCompletionAgent;
  let mockUser: User;
  let mockNCA: NCA;
  let mockMJC: MJC;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ContentCompletionAgent();

    mockUser = {
      id: 'user-123',
      role: 'operator',
      name: 'Test User',
      department: 'Production',
      induction_completed: true,
      induction_date: '2024-01-01',
    };

    mockNCA = {
      nca_id: 'NCA-001',
      nc_description: 'Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet.',
      nc_type: 'finished-goods',
      machine_status: 'operational',
      cross_contamination: false,
      disposition_rework: true,
      disposition_concession: false,
      root_cause_analysis: 'Temperature was too low. Why? Because the heater malfunctioned. Why? Because the sensor drifted. Why? Because calibration was overdue by 3 weeks.',
      corrective_action: '1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6. 3) QA will verify on next batch (due 10-Oct).',
      work_order_id: 'WO-456',
    };

    mockMJC = {
      mjc_id: 'MJC-001',
      description_required: 'Machine stopped unexpectedly. Error code E-403.',
      maintenance_category: 'reactive',
      maintenance_type_electrical: true,
      maintenance_type_mechanical: false,
      maintenance_type_pneumatical: false,
      machine_status: 'down',
      urgency: 'critical',
      temporary_repair: false,
      machine_equipment: 'Laminator-01',
      maintenance_performed: 'Replaced faulty relay.',
    };
  });

  describe('analyze - Basic Functionality', () => {
    it('should return agent result with required fields', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');

      expect(Array.isArray(result.requirements)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.reasoning).toBe('string');
    });

    it('should have high confidence (rule-based checks)', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Rule-based validation has high confidence
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should include reasoning in result', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.reasoning).toContain('Content Completion Agent');
      expect(result.reasoning).toContain('nca');
      expect(result.reasoning).toContain('rule-based validation');
    });

    it('should work with MJC form type', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockMJC, mockUser, 'mjc');

      expect(result).toBeDefined();
      expect(result.reasoning).toContain('mjc');
    });
  });

  describe('Description Completeness Validation', () => {
    it('should detect error severity issues in description', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Description must be at least 150 characters',
            severity: 'error',
            brcgsReference: 'BRCGS 5.7.2',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.errors.length).toBeGreaterThan(0);
      const error = result.errors.find((e) => e.field === 'nc_description');
      expect(error).toBeDefined();
      expect(error?.message).toContain('150 characters');
      expect(error?.brcgs_requirement).toBe('BRCGS 5.7.2');
    });

    it('should detect warning severity issues in description', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Consider adding more details',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Add time of occurrence',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.requirements.length).toBeGreaterThan(0);
      const req = result.requirements.find((r) => r.field === 'nc_description');
      expect(req).toBeDefined();
      expect(req?.message).toContain('more details');
      expect(req?.reference).toBe('BRCGS 5.7.2');
      expect(req?.exampleFix).toBe('Add time of occurrence');
    });

    it('should detect missing requirements', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [],
        missingRequirements: ['when it occurred (time/date)', 'quantity affected'],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.requirements.length).toBeGreaterThanOrEqual(2);
      expect(result.requirements.some((r) => r.message.includes('when it occurred'))).toBe(true);
      expect(result.requirements.some((r) => r.message.includes('quantity affected'))).toBe(true);
    });

    it('should call validateDescriptionCompleteness with correct parameters', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      await agent.analyze(mockNCA, mockUser, 'nca');

      expect(validateDescriptionCompleteness).toHaveBeenCalledWith(
        mockNCA.nc_description,
        mockNCA.nc_type
      );
    });

    it('should not validate description if missing', async () => {
      const ncaWithoutDescription: Partial<NCA> = {
        ...mockNCA,
        nc_description: undefined as any,
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(ncaWithoutDescription as NCA, mockUser, 'nca');

      expect(validateDescriptionCompleteness).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should not validate description if nc_type missing', async () => {
      const ncaWithoutType: Partial<NCA> = {
        ...mockNCA,
        nc_type: undefined as any,
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(ncaWithoutType as NCA, mockUser, 'nca');

      expect(validateDescriptionCompleteness).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Root Cause Depth Validation', () => {
    it('should detect shallow root cause analysis', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateRootCauseDepth as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'root_cause_analysis',
            message: 'Root cause analysis is too shallow',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Use 5-Why methodology',
          },
        ],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.requirements.length).toBeGreaterThan(0);
      const req = result.requirements.find((r) => r.field === 'root_cause_analysis');
      expect(req).toBeDefined();
      expect(req?.message).toContain('too shallow');
      expect(req?.reference).toBe('BRCGS 5.7.2');
      expect(req?.exampleFix).toBe('Use 5-Why methodology');
    });

    it('should call validateRootCauseDepth with correct parameter', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateRootCauseDepth as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
      });

      await agent.analyze(mockNCA, mockUser, 'nca');

      expect(validateRootCauseDepth).toHaveBeenCalledWith(mockNCA.root_cause_analysis);
    });

    it('should not validate root cause if missing', async () => {
      const ncaWithoutRootCause: Partial<NCA> = {
        ...mockNCA,
        root_cause_analysis: undefined,
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateRootCauseDepth as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
      });

      const result = await agent.analyze(ncaWithoutRootCause as NCA, mockUser, 'nca');

      expect(validateRootCauseDepth).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle multiple root cause issues', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateRootCauseDepth as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'root_cause_analysis',
            message: 'Issue 1',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Fix 1',
          },
          {
            field: 'root_cause_analysis',
            message: 'Issue 2',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Fix 2',
          },
        ],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      const rootCauseReqs = result.requirements.filter((r) => r.field === 'root_cause_analysis');
      expect(rootCauseReqs.length).toBe(2);
    });
  });

  describe('Corrective Action Specificity Validation', () => {
    it('should detect vague corrective actions', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateCorrectiveActionSpecificity as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'corrective_action',
            message: 'Corrective action lacks specificity',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Include who, what, when, and how',
          },
        ],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.requirements.length).toBeGreaterThan(0);
      const req = result.requirements.find((r) => r.field === 'corrective_action');
      expect(req).toBeDefined();
      expect(req?.message).toContain('lacks specificity');
      expect(req?.reference).toBe('BRCGS 5.7.2');
      expect(req?.exampleFix).toContain('who, what, when');
    });

    it('should call validateCorrectiveActionSpecificity with correct parameter', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateCorrectiveActionSpecificity as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
      });

      await agent.analyze(mockNCA, mockUser, 'nca');

      expect(validateCorrectiveActionSpecificity).toHaveBeenCalledWith(mockNCA.corrective_action);
    });

    it('should not validate corrective action if missing', async () => {
      const ncaWithoutAction: Partial<NCA> = {
        ...mockNCA,
        corrective_action: undefined,
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateCorrectiveActionSpecificity as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
      });

      const result = await agent.analyze(ncaWithoutAction as NCA, mockUser, 'nca');

      expect(validateCorrectiveActionSpecificity).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle multiple corrective action issues', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateCorrectiveActionSpecificity as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'corrective_action',
            message: 'Issue 1',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Fix 1',
          },
          {
            field: 'corrective_action',
            message: 'Issue 2',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Fix 2',
          },
        ],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      const actionReqs = result.requirements.filter((r) => r.field === 'corrective_action');
      expect(actionReqs.length).toBe(2);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have highest confidence when errors found (0.9)', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Error found',
            severity: 'error',
            brcgsReference: 'BRCGS 5.7.2',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.confidence).toBe(0.9);
    });

    it('should have default high confidence when no issues found (0.8)', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.confidence).toBe(0.8);
    });

    it('should have lower confidence when no issues found (might be false negative) (0.7)', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      (validateRootCauseDepth as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
      });

      (validateCorrectiveActionSpecificity as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // No errors, no requirements = lower confidence
      expect(result.confidence).toBe(0.7);
    });

    it('should have high confidence when requirements found (0.8)', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Warning found',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Has requirements but no errors
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('Reasoning Generation', () => {
    it('should include error count in reasoning', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Error 1',
            severity: 'error',
          },
          {
            field: 'nc_description',
            message: 'Error 2',
            severity: 'error',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.reasoning).toContain('2 errors');
    });

    it('should include requirement count in reasoning', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [],
        missingRequirements: ['req1', 'req2', 'req3'],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.reasoning).toContain('3 missing requirements');
    });

    it('should mention policy schemas in reasoning', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.reasoning).toContain('policy schemas');
    });
  });

  describe('Combined Validation', () => {
    it('should combine findings from all validation functions', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Description issue',
            severity: 'error',
            brcgsReference: 'BRCGS 5.7.2',
          },
        ],
        missingRequirements: ['time'],
        vaguePhrases: [],
      });

      (validateRootCauseDepth as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'root_cause_analysis',
            message: 'Root cause issue',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Add depth',
          },
        ],
      });

      (validateCorrectiveActionSpecificity as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'corrective_action',
            message: 'Action issue',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
            exampleFix: 'Be specific',
          },
        ],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Should have: 1 error + 1 missing req + 2 warning issues = 3 requirements, 1 error
      expect(result.errors.length).toBe(1);
      expect(result.requirements.length).toBeGreaterThanOrEqual(3);

      // Check all fields covered
      expect(result.errors.some((e) => e.field === 'nc_description')).toBe(true);
      expect(result.requirements.some((r) => r.field === 'nc_description')).toBe(true);
      expect(result.requirements.some((r) => r.field === 'root_cause_analysis')).toBe(true);
      expect(result.requirements.some((r) => r.field === 'corrective_action')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation function throwing error', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockImplementation(() => {
        throw new Error('Validation error');
      });

      // Should not crash
      await expect(agent.analyze(mockNCA, mockUser, 'nca')).resolves.toBeDefined();
    });

    it('should handle malformed validation response', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: null as any, // Malformed
        missingRequirements: undefined as any,
        vaguePhrases: undefined as any,
      });

      // Should not crash
      const result = await agent.analyze(mockNCA, mockUser, 'nca');
      expect(result).toBeDefined();
    });

    it('should handle empty issues array', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.errors.length).toBe(0);
      expect(result.requirements.length).toBe(0);
    });

    it('should handle issue without brcgsReference', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Issue without BRCGS ref',
            severity: 'warning',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      const req = result.requirements[0];
      expect(req).toBeDefined();
      expect(req.reference).toBeUndefined();
    });

    it('should handle issue without exampleFix', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Issue without example fix',
            severity: 'warning',
            brcgsReference: 'BRCGS 5.7.2',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      const req = result.requirements[0];
      expect(req).toBeDefined();
      expect(req.exampleFix).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle NCA with all optional fields undefined', async () => {
      const minimalNCA: Partial<NCA> = {
        nca_id: 'NCA-MINIMAL',
        nc_description: 'Description',
        nc_type: 'other',
        machine_status: 'operational',
        cross_contamination: false,
        disposition_rework: false,
        disposition_concession: false,
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(minimalNCA as NCA, mockUser, 'nca');

      // Should not validate root cause or corrective action
      expect(validateRootCauseDepth).not.toHaveBeenCalled();
      expect(validateCorrectiveActionSpecificity).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle very long validation messages', async () => {
      const longMessage = 'A'.repeat(5000);
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: longMessage,
            severity: 'error',
          },
        ],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.errors[0].message).toBe(longMessage);
    });

    it('should handle user with different roles', async () => {
      const qaUser: User = {
        ...mockUser,
        role: 'qa-supervisor',
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, qaUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle empty strings in NCA fields', async () => {
      const emptyNCA: Partial<NCA> = {
        ...mockNCA,
        nc_description: '',
        root_cause_analysis: '',
        corrective_action: '',
      };

      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        issues: [],
        missingRequirements: [],
        vaguePhrases: [],
      });

      const result = await agent.analyze(emptyNCA as NCA, mockUser, 'nca');

      // Empty strings should be treated as missing
      expect(result).toBeDefined();
    });

    it('should return no warnings (only errors and requirements)', async () => {
      (validateDescriptionCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        issues: [
          {
            field: 'nc_description',
            message: 'Error',
            severity: 'error',
          },
        ],
        missingRequirements: ['req'],
        vaguePhrases: [],
      });

      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // Content completion agent should not produce warnings
      expect(result.warnings.length).toBe(0);
    });
  });
});
