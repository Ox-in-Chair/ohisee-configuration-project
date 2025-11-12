/**
 * Comprehensive Test Suite for AdaptivePolicyService
 * Target Coverage: >95%
 *
 * Tests:
 * - Policy retrieval (current, default)
 * - Rule performance analytics
 * - Rule suggestion generation
 * - Policy version creation
 * - Error handling and edge cases
 */

import { AdaptivePolicyService, PolicyVersion, PolicyRule, PolicyAnalytics, RuleSuggestion } from '../adaptive-policy-service';
import { createServerClient } from '@/lib/database/client';

// Mock Supabase client
jest.mock('@/lib/database/client', () => ({
  createServerClient: jest.fn(),
}));

describe('AdaptivePolicyService', () => {
  let service: AdaptivePolicyService;
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
    service = new AdaptivePolicyService();
  });

  describe('getCurrentPolicy', () => {
    it('should retrieve active policy version from database', async () => {
      const mockPolicyData = {
        version: '2.1.0',
        effective_date: '2025-01-01T00:00:00Z',
        status: 'active',
        rules: [
          {
            id: 'rule-1',
            field: 'nc_description',
            ruleType: 'minLength',
            parameters: { minLength: 100 },
            brcgsReference: 'BRCGS 5.7.1',
            enabled: true,
          },
        ],
        changelog: ['Updated minimum length for descriptions', 'Added new completeness rule'],
      };

      mockSupabase.single.mockResolvedValue({ data: mockPolicyData, error: null });

      const result = await service.getCurrentPolicy();

      expect(mockSupabase.from).toHaveBeenCalledWith('policy_versions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockSupabase.single).toHaveBeenCalled();

      expect(result).toEqual({
        version: '2.1.0',
        effectiveDate: new Date('2025-01-01T00:00:00Z'),
        rules: mockPolicyData.rules,
        changelog: mockPolicyData.changelog,
      });
    });

    it('should return default policy when no active policy exists', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.getCurrentPolicy();

      expect(result).toEqual({
        version: '1.0.0',
        effectiveDate: expect.any(Date),
        rules: [],
        changelog: ['Initial policy version'],
      });
    });

    it('should return default policy on database error', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabase.single.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.getCurrentPolicy();

      expect(result).toEqual({
        version: '1.0.0',
        effectiveDate: expect.any(Date),
        rules: [],
        changelog: ['Initial policy version'],
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Policy retrieval failed:', mockError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty rules and changelog gracefully', async () => {
      const mockPolicyData = {
        version: '1.5.0',
        effective_date: '2024-06-01T00:00:00Z',
        status: 'active',
        rules: null,
        changelog: null,
      };

      mockSupabase.single.mockResolvedValue({ data: mockPolicyData, error: null });

      const result = await service.getCurrentPolicy();

      expect(result.rules).toEqual([]);
      expect(result.changelog).toEqual([]);
    });
  });

  describe('analyzeRulePerformance', () => {
    const mockRuleId = 'rule-description-length';
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    it('should calculate rule performance metrics correctly', async () => {
      const mockEnforcementLogs = [
        { action_taken: 'submission_allowed', attempt_number: 1, requirements_missing: [] },
        { action_taken: 'submission_allowed', attempt_number: 2, requirements_missing: [] },
        { action_taken: 'submission_blocked', attempt_number: 3, requirements_missing: [{ field: 'root_cause' }] },
        { action_taken: 'submission_blocked', attempt_number: 2, requirements_missing: [{ field: 'corrective_action' }] },
        { action_taken: 'manager_approval_required', attempt_number: 4, requirements_missing: [] },
      ];

      // Mock should return { data: array } not { data: array, error: null }
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockEnforcementLogs, error: null }),
      });

      const result = await service.analyzeRulePerformance(mockRuleId);

      expect(mockSupabase.from).toHaveBeenCalledWith('enforcement_log');

      expect(result).toEqual({
        ruleId: mockRuleId,
        totalChecks: 5,
        passCount: 2,
        failCount: 2,
        overrideCount: 1,
        averageAttempts: 2.4, // (1 + 2 + 3 + 2 + 4) / 5
        commonFailures: expect.arrayContaining([
          expect.objectContaining({ element: expect.any(String), count: expect.any(Number) }),
        ]),
      });
    });

    it('should extract common failure reasons correctly', async () => {
      const mockEnforcementLogs = [
        {
          action_taken: 'submission_blocked',
          attempt_number: 1,
          requirements_missing: [{ field: 'root_cause' }, { field: 'verification' }],
        },
        {
          action_taken: 'submission_blocked',
          attempt_number: 1,
          requirements_missing: [{ field: 'root_cause' }],
        },
        {
          action_taken: 'submission_blocked',
          attempt_number: 1,
          requirements_missing: [{ field: 'root_cause' }, { field: 'corrective_action' }],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockEnforcementLogs, error: null }),
      });

      const result = await service.analyzeRulePerformance(mockRuleId);

      expect(result.commonFailures).toEqual([
        { element: 'root_cause', count: 3 },
        { element: 'verification', count: 1 },
        { element: 'corrective_action', count: 1 },
      ]);
    });

    it('should return zero metrics when no logs exist', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.analyzeRulePerformance(mockRuleId);

      expect(result).toEqual({
        ruleId: mockRuleId,
        totalChecks: 0,
        passCount: 0,
        failCount: 0,
        overrideCount: 0,
        averageAttempts: 1,
        commonFailures: [],
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Query timeout');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        gte: jest.fn().mockRejectedValue(mockError),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.analyzeRulePerformance(mockRuleId);

      expect(result).toEqual({
        ruleId: mockRuleId,
        totalChecks: 0,
        passCount: 0,
        failCount: 0,
        overrideCount: 0,
        averageAttempts: 1,
        commonFailures: [],
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Rule analytics failed:', mockError);
      consoleErrorSpy.mockRestore();
    });

    it('should limit common failures to top 5', async () => {
      const mockEnforcementLogs = Array.from({ length: 10 }, (_, i) => ({
        action_taken: 'submission_blocked',
        attempt_number: 1,
        requirements_missing: [{ field: `field_${i}` }],
      }));

      mockSupabase.single.mockResolvedValue({ data: mockEnforcementLogs, error: null });

      const result = await service.analyzeRulePerformance(mockRuleId);

      expect(result.commonFailures.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateRuleSuggestions', () => {
    it('should suggest relaxing rules with high override rate (>30%)', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'strict-rule',
            field: 'nc_description',
            ruleType: 'minLength',
            parameters: { minLength: 200 },
            enabled: true,
          },
        ],
        changelog: [],
      };

      const mockAnalytics: PolicyAnalytics = {
        ruleId: 'strict-rule',
        totalChecks: 100,
        passCount: 30,
        failCount: 35,
        overrideCount: 35, // 35% override rate
        averageAttempts: 2.0,
        commonFailures: [],
      };

      // Mock getCurrentPolicy
      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }); // For analyzeRulePerformance

      // Mock analyzeRulePerformance to return high override rate
      jest.spyOn(service, 'analyzeRulePerformance').mockResolvedValue(mockAnalytics);

      const suggestions = await service.generateRuleSuggestions();

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          ruleId: 'strict-rule',
          field: 'nc_description',
          ruleType: 'minLength',
          reason: expect.stringContaining('High override rate (35%) suggests rule may be too strict'),
          confidence: 0.7,
          suggestedBy: 'analytics',
          parameters: expect.objectContaining({ minLength: 180 }), // 200 * 0.9 = 180
        })
      );
    });

    it('should suggest clarity improvements for rules with high average attempts (>2.5)', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'unclear-rule',
            field: 'root_cause_analysis',
            ruleType: 'completeness',
            parameters: { requiredElements: ['why', 'cause'] },
            enabled: true,
          },
        ],
        changelog: [],
      };

      const mockAnalytics: PolicyAnalytics = {
        ruleId: 'unclear-rule',
        totalChecks: 50,
        passCount: 40,
        failCount: 10,
        overrideCount: 0,
        averageAttempts: 3.2, // High average attempts
        commonFailures: [],
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      jest.spyOn(service, 'analyzeRulePerformance').mockResolvedValue(mockAnalytics);

      const suggestions = await service.generateRuleSuggestions();

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          ruleId: 'unclear-rule',
          field: 'root_cause_analysis',
          reason: expect.stringContaining('High average attempts (3.2) suggests rule clarity needs improvement'),
          confidence: 0.8,
          suggestedBy: 'analytics',
        })
      );
    });

    it('should suggest new rules for common failure patterns', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'existing-rule',
            field: 'corrective_action',
            ruleType: 'minLength',
            parameters: { minLength: 50 },
            enabled: true,
          },
        ],
        changelog: [],
      };

      const mockAnalytics: PolicyAnalytics = {
        ruleId: 'existing-rule',
        totalChecks: 100,
        passCount: 70,
        failCount: 30,
        overrideCount: 0,
        averageAttempts: 2.0,
        commonFailures: [
          { element: 'verification_method', count: 25 }, // Commonly missing
        ],
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      jest.spyOn(service, 'analyzeRulePerformance').mockResolvedValue(mockAnalytics);

      const suggestions = await service.generateRuleSuggestions();

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          field: 'corrective_action',
          ruleType: 'completeness',
          parameters: { requiredElements: 'verification_method' },
          reason: expect.stringContaining('Commonly missing: verification_method'),
          confidence: 0.75,
          suggestedBy: 'analytics',
        })
      );
    });

    it('should return empty array when no suggestions needed', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'good-rule',
            field: 'nc_description',
            ruleType: 'minLength',
            parameters: { minLength: 100 },
            enabled: true,
          },
        ],
        changelog: [],
      };

      const mockAnalytics: PolicyAnalytics = {
        ruleId: 'good-rule',
        totalChecks: 100,
        passCount: 95,
        failCount: 5,
        overrideCount: 0, // No overrides
        averageAttempts: 1.2, // Low average attempts
        commonFailures: [], // No common failures
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      jest.spyOn(service, 'analyzeRulePerformance').mockResolvedValue(mockAnalytics);

      const suggestions = await service.generateRuleSuggestions();

      expect(suggestions).toEqual([]);
    });

    it('should handle multiple rules and generate combined suggestions', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'rule-1',
            field: 'nc_description',
            ruleType: 'minLength',
            parameters: { minLength: 200 },
            enabled: true,
          },
          {
            id: 'rule-2',
            field: 'root_cause_analysis',
            ruleType: 'completeness',
            parameters: { requiredElements: ['why'] },
            enabled: true,
          },
        ],
        changelog: [],
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValue({ data: null, error: null });

      jest.spyOn(service, 'analyzeRulePerformance')
        .mockResolvedValueOnce({
          ruleId: 'rule-1',
          totalChecks: 100,
          passCount: 30,
          failCount: 35,
          overrideCount: 35,
          averageAttempts: 2.0,
          commonFailures: [],
        })
        .mockResolvedValueOnce({
          ruleId: 'rule-2',
          totalChecks: 100,
          passCount: 40,
          failCount: 60,
          overrideCount: 0,
          averageAttempts: 3.5,
          commonFailures: [],
        });

      const suggestions = await service.generateRuleSuggestions();

      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      expect(suggestions.some(s => s.ruleId === 'rule-1')).toBe(true);
      expect(suggestions.some(s => s.ruleId === 'rule-2')).toBe(true);
    });
  });

  describe('createPolicyVersion', () => {
    const mockAdminId = 'admin-123';

    it('should create new policy version and deactivate previous', async () => {
      const newRules: PolicyRule[] = [
        {
          id: 'new-rule-1',
          field: 'nc_description',
          ruleType: 'minLength',
          parameters: { minLength: 150 },
          brcgsReference: 'BRCGS 5.7.1',
          enabled: true,
        },
      ];

      const changelog = ['Relaxed description minimum length', 'Added new clarity checks'];

      // Mock version generation
      mockSupabase.single
        .mockResolvedValueOnce({ data: { version: '2.0.0' }, error: null }) // Latest version
        .mockResolvedValueOnce({
          data: {
            version: '2.1.0',
            effective_date: '2025-11-12T00:00:00Z',
            status: 'active',
            rules: newRules,
            changelog,
            created_by: mockAdminId,
          },
          error: null,
        }); // New version insert

      mockSupabase.update.mockReturnThis();

      const result = await service.createPolicyVersion(newRules, changelog, mockAdminId);

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        version: '2.1.0',
        effective_date: expect.any(String),
        status: 'active',
        rules: newRules,
        changelog,
        created_by: mockAdminId,
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'inactive' });
      expect(mockSupabase.neq).toHaveBeenCalledWith('version', '2.1.0');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');

      expect(result).toEqual({
        version: '2.1.0',
        effectiveDate: expect.any(Date),
        rules: newRules,
        changelog,
      });
    });

    it('should generate version 1.0.0 when no previous versions exist', async () => {
      const newRules: PolicyRule[] = [];
      const changelog = ['Initial policy version'];

      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: null }) // No previous version
        .mockResolvedValueOnce({
          data: {
            version: '1.0.0',
            effective_date: '2025-11-12T00:00:00Z',
            status: 'active',
            rules: newRules,
            changelog,
            created_by: mockAdminId,
          },
          error: null,
        });

      const result = await service.createPolicyVersion(newRules, changelog, mockAdminId);

      expect(result.version).toBe('1.0.0');
    });

    it('should increment minor version correctly', async () => {
      const newRules: PolicyRule[] = [];
      const changelog = ['Minor update'];

      mockSupabase.single
        .mockResolvedValueOnce({ data: { version: '1.5.0' }, error: null })
        .mockResolvedValueOnce({
          data: {
            version: '1.6.0',
            effective_date: '2025-11-12T00:00:00Z',
            status: 'active',
            rules: newRules,
            changelog,
            created_by: mockAdminId,
          },
          error: null,
        });

      const result = await service.createPolicyVersion(newRules, changelog, mockAdminId);

      expect(result.version).toBe('1.6.0');
    });

    it('should throw error when database insert fails', async () => {
      const newRules: PolicyRule[] = [];
      const changelog = ['Test'];
      const mockError = new Error('Insert failed');

      mockSupabase.single
        .mockResolvedValueOnce({ data: { version: '1.0.0' }, error: null })
        .mockResolvedValueOnce({ data: null, error: mockError });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.createPolicyVersion(newRules, changelog, mockAdminId)).rejects.toThrow(mockError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Policy version creation failed:', mockError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle complex version increments', async () => {
      const testCases = [
        { current: '1.0.0', expected: '1.1.0' },
        { current: '2.9.0', expected: '2.10.0' },
        { current: '10.99.0', expected: '10.100.0' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        mockSupabase.single
          .mockResolvedValueOnce({ data: { version: testCase.current }, error: null })
          .mockResolvedValueOnce({
            data: {
              version: testCase.expected,
              effective_date: '2025-11-12T00:00:00Z',
              status: 'active',
              rules: [],
              changelog: [],
              created_by: mockAdminId,
            },
            error: null,
          });

        const result = await service.createPolicyVersion([], [], mockAdminId);

        expect(result.version).toBe(testCase.expected);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty policy rules array', async () => {
      const mockPolicy = {
        version: '1.0.0',
        effective_date: '2025-01-01T00:00:00Z',
        status: 'active',
        rules: [],
        changelog: [],
      };

      mockSupabase.single.mockResolvedValue({ data: mockPolicy, error: null });

      const result = await service.getCurrentPolicy();

      expect(result.rules).toEqual([]);
    });

    it('should handle malformed analytics data', async () => {
      const mockEnforcementLogs = [
        { action_taken: null, attempt_number: null, requirements_missing: null },
        { action_taken: 'unknown_action', attempt_number: 'invalid', requirements_missing: [] },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockEnforcementLogs, error: null }),
      });

      const result = await service.analyzeRulePerformance('test-rule');

      // Should not throw and should return valid metrics
      expect(result.totalChecks).toBe(2);
      expect(result.passCount).toBe(0);
      expect(result.failCount).toBe(0);
    });

    it('should handle concurrent policy version creation', async () => {
      const newRules: PolicyRule[] = [];
      const changelog = ['Test'];
      const mockAdminId = 'admin-123';

      // Simulate race condition where version already exists
      const duplicateError = new Error('duplicate key value violates unique constraint');

      mockSupabase.single
        .mockResolvedValueOnce({ data: { version: '1.0.0' }, error: null })
        .mockResolvedValueOnce({ data: null, error: duplicateError });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.createPolicyVersion(newRules, changelog, mockAdminId)).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Private Methods (via public API)', () => {
    it('should correctly relax minLength parameters', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'length-rule',
            field: 'nc_description',
            ruleType: 'minLength',
            parameters: { minLength: 100 },
            enabled: true,
          },
        ],
        changelog: [],
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      jest.spyOn(service, 'analyzeRulePerformance').mockResolvedValue({
        ruleId: 'length-rule',
        totalChecks: 100,
        passCount: 30,
        failCount: 35,
        overrideCount: 35,
        averageAttempts: 2.0,
        commonFailures: [],
      });

      const suggestions = await service.generateRuleSuggestions();

      const relaxedSuggestion = suggestions.find(s => s.ruleId === 'length-rule');
      expect(relaxedSuggestion?.parameters.minLength).toBe(90); // 100 * 0.9 = 90
    });

    it('should enforce minimum of 50 characters when relaxing', async () => {
      const mockPolicy: PolicyVersion = {
        version: '2.0.0',
        effectiveDate: new Date(),
        rules: [
          {
            id: 'short-rule',
            field: 'nc_description',
            ruleType: 'minLength',
            parameters: { minLength: 55 },
            enabled: true,
          },
        ],
        changelog: [],
      };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockPolicy, effective_date: mockPolicy.effectiveDate.toISOString(), status: 'active' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      jest.spyOn(service, 'analyzeRulePerformance').mockResolvedValue({
        ruleId: 'short-rule',
        totalChecks: 100,
        passCount: 30,
        failCount: 35,
        overrideCount: 35,
        averageAttempts: 2.0,
        commonFailures: [],
      });

      const suggestions = await service.generateRuleSuggestions();

      const relaxedSuggestion = suggestions.find(s => s.ruleId === 'short-rule');
      expect(relaxedSuggestion?.parameters.minLength).toBe(50); // Max(50, 55 * 0.9) = 50
    });
  });
});
