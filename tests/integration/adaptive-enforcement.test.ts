/**
 * Adaptive Enforcement Integration Tests
 * Tests progressive escalation across multiple submission attempts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  adaptValidationToEnforcementLevel,
  getEnforcementLevel,
  analyzeUserPattern,
  type EnforcementAttempt,
} from '@/lib/services/adaptive-enforcement';
import { validateDescriptionCompleteness } from '@/lib/services/quality-enforcement-service';

describe('Adaptive Enforcement Integration', () => {
  describe('Progressive Escalation Workflow', () => {
    it('should escalate from soft to moderate to strict to manager-approval', () => {
      const issues = [
        {
          field: 'nc_description',
          message: 'Description too short',
          severity: 'error' as const,
          brcgsReference: 'BRCGS 5.7.2',
        },
      ];

      // Attempt 1: Soft
      const attempt1 = adaptValidationToEnforcementLevel(issues, 1);
      expect(attempt1.enforcementLevel).toBe('soft');
      expect(attempt1.requirements.length).toBeGreaterThan(0);
      expect(attempt1.errors.length).toBe(0);

      // Attempt 2: Moderate
      const attempt2 = adaptValidationToEnforcementLevel(issues, 2);
      expect(attempt2.enforcementLevel).toBe('moderate');
      expect(attempt2.errors.length).toBeGreaterThan(0);

      // Attempt 3: Strict
      const attempt3 = adaptValidationToEnforcementLevel(issues, 3);
      expect(attempt3.enforcementLevel).toBe('strict');
      expect(attempt3.errors.length).toBeGreaterThan(0);

      // Attempt 4: Manager Approval
      const attempt4 = adaptValidationToEnforcementLevel(issues, 4);
      expect(attempt4.enforcementLevel).toBe('manager-approval');
      expect(attempt4.requiresManagerApproval).toBe(true);
    });

    it('should track persistent issues across attempts', () => {
      const attempts: EnforcementAttempt[] = [
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 1,
          timestamp: new Date('2025-01-01T10:00:00'),
          validationResult: {
            valid: false,
            issues: [],
            missingRequirements: ['time'],
            vaguePhrases: [],
          },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 2,
          timestamp: new Date('2025-01-01T10:05:00'),
          validationResult: {
            valid: false,
            issues: [],
            missingRequirements: ['time'],
            vaguePhrases: [],
          },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 3,
          timestamp: new Date('2025-01-01T10:10:00'),
          validationResult: {
            valid: false,
            issues: [],
            missingRequirements: ['time'],
            vaguePhrases: [],
          },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
      ];

      const pattern = analyzeUserPattern(attempts);
      expect(pattern.totalAttempts).toBe(3);
      expect(pattern.escalationTriggered).toBe(true);
      expect(pattern.frequentIssues).toContain('nc_description');
    });
  });

  describe('Real-world Validation Scenarios', () => {
    it('should handle incomplete description across multiple attempts', () => {
      const shortDescription = 'Bad product.';
      const validation = validateDescriptionCompleteness(shortDescription, 'finished-goods');

      // First attempt: Requirements only
      const attempt1 = adaptValidationToEnforcementLevel(validation.issues, 1);
      expect(attempt1.enforcementLevel).toBe('soft');
      expect(attempt1.requirements.length).toBeGreaterThan(0);

      // Second attempt: Escalate to errors
      const attempt2 = adaptValidationToEnforcementLevel(validation.issues, 2);
      expect(attempt2.enforcementLevel).toBe('moderate');
      expect(attempt2.errors.length).toBeGreaterThan(0);
      expect(attempt2.errors[0].message).toContain('required for compliance');
    });

    it('should handle shallow root cause across multiple attempts', () => {
      const shallowAnalysis = 'Operator error.';
      const validation = validateDescriptionCompleteness(shallowAnalysis, 'finished-goods');

      // Third attempt: All errors
      const attempt3 = adaptValidationToEnforcementLevel(validation.issues, 3);
      expect(attempt3.enforcementLevel).toBe('strict');
      expect(attempt3.errors.length).toBeGreaterThan(0);
      expect(attempt3.errors[0].message).toContain('must be addressed');
    });
  });

  describe('Enforcement Level Transitions', () => {
    it('should transition correctly through all levels', () => {
      const levels = [1, 2, 3, 4, 5].map((attempt) => ({
        attempt,
        level: getEnforcementLevel(attempt),
      }));

      expect(levels[0].level).toBe('soft');
      expect(levels[1].level).toBe('moderate');
      expect(levels[2].level).toBe('strict');
      expect(levels[3].level).toBe('manager-approval');
      expect(levels[4].level).toBe('manager-approval');
    });
  });
});

