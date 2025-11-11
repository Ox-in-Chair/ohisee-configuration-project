/**
 * Adaptive Enforcement Service Unit Tests
 * Tests progressive escalation logic based on attempt numbers
 */

import { describe, it, expect } from '@jest/globals';
import {
  getEnforcementLevel,
  adaptValidationToEnforcementLevel,
  analyzeUserPattern,
  detectContentPattern,
  getEscalationMessage,
  type EnforcementAttempt,
} from '../adaptive-enforcement';

describe('Adaptive Enforcement Service', () => {
  describe('getEnforcementLevel', () => {
    it('should return "soft" for first attempt', () => {
      expect(getEnforcementLevel(1)).toBe('soft');
    });

    it('should return "moderate" for second attempt', () => {
      expect(getEnforcementLevel(2)).toBe('moderate');
    });

    it('should return "strict" for third attempt', () => {
      expect(getEnforcementLevel(3)).toBe('strict');
    });

    it('should return "manager-approval" for fourth+ attempt', () => {
      expect(getEnforcementLevel(4)).toBe('manager-approval');
      expect(getEnforcementLevel(5)).toBe('manager-approval');
    });
  });

  describe('adaptValidationToEnforcementLevel', () => {
    const mockIssues = [
      {
        field: 'nc_description',
        message: 'Description too short',
        severity: 'error' as const,
        brcgsReference: 'BRCGS 5.7.2',
        exampleFix: 'Add more details',
      },
      {
        field: 'root_cause_analysis',
        message: 'Root cause too shallow',
        severity: 'warning' as const,
        exampleFix: 'Use 5-Why method',
      },
    ];

    it('should convert errors to requirements on first attempt', () => {
      const result = adaptValidationToEnforcementLevel(mockIssues, 1);
      expect(result.enforcementLevel).toBe('soft');
      expect(result.requirements.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      expect(result.requiresManagerApproval).toBe(false);
    });

    it('should escalate to errors on second attempt', () => {
      const result = adaptValidationToEnforcementLevel(mockIssues, 2);
      expect(result.enforcementLevel).toBe('moderate');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.requiresManagerApproval).toBe(false);
    });

    it('should make all issues errors on third attempt', () => {
      const result = adaptValidationToEnforcementLevel(mockIssues, 3);
      expect(result.enforcementLevel).toBe('strict');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.requiresManagerApproval).toBe(false);
    });

    it('should require manager approval on fourth attempt', () => {
      const result = adaptValidationToEnforcementLevel(mockIssues, 4);
      expect(result.enforcementLevel).toBe('manager-approval');
      expect(result.requiresManagerApproval).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include escalation reason for attempts > 1', () => {
      const result = adaptValidationToEnforcementLevel(mockIssues, 2);
      expect(result.escalationReason).toContain('attempt 2');
    });
  });

  describe('analyzeUserPattern', () => {
    const mockAttempts: EnforcementAttempt[] = [
      {
        userId: 'user-1',
        formType: 'nca',
        attemptNumber: 1,
        timestamp: new Date('2025-01-01'),
        validationResult: {
          valid: false,
          issues: [],
          missingRequirements: ['time', 'location'],
          vaguePhrases: [],
        },
        issues: [
          { field: 'nc_description', message: 'Missing time', severity: 'error' },
          { field: 'nc_description', message: 'Missing location', severity: 'error' },
        ],
      },
      {
        userId: 'user-1',
        formType: 'nca',
        attemptNumber: 2,
        timestamp: new Date('2025-01-01'),
        validationResult: {
          valid: false,
          issues: [],
          missingRequirements: ['time'],
          vaguePhrases: [],
        },
        issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
      },
    ];

    it('should calculate total attempts', () => {
      const pattern = analyzeUserPattern(mockAttempts);
      expect(pattern.totalAttempts).toBe(2);
    });

    it('should identify frequent issues', () => {
      const pattern = analyzeUserPattern(mockAttempts);
      expect(pattern.frequentIssues).toContain('nc_description');
    });

    it('should detect escalation triggered', () => {
      const escalatedAttempts: EnforcementAttempt[] = [
        ...mockAttempts,
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 3,
          timestamp: new Date('2025-01-01'),
          validationResult: {
            valid: false,
            issues: [],
            missingRequirements: [],
            vaguePhrases: [],
          },
          issues: [],
        },
      ];
      const pattern = analyzeUserPattern(escalatedAttempts);
      expect(pattern.escalationTriggered).toBe(true);
    });
  });

  describe('detectContentPattern', () => {
    it('should return null for insufficient attempts', () => {
      const attempts: EnforcementAttempt[] = [
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 1,
          timestamp: new Date(),
          validationResult: { valid: false, issues: [], missingRequirements: [], vaguePhrases: [] },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
      ];
      expect(detectContentPattern(attempts)).toBeNull();
    });

    it('should detect persistent issues across attempts', () => {
      const attempts: EnforcementAttempt[] = [
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 1,
          timestamp: new Date(),
          validationResult: { valid: false, issues: [], missingRequirements: [], vaguePhrases: [] },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 2,
          timestamp: new Date(),
          validationResult: { valid: false, issues: [], missingRequirements: [], vaguePhrases: [] },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
        {
          userId: 'user-1',
          formType: 'nca',
          attemptNumber: 3,
          timestamp: new Date(),
          validationResult: { valid: false, issues: [], missingRequirements: [], vaguePhrases: [] },
          issues: [{ field: 'nc_description', message: 'Missing time', severity: 'error' }],
        },
      ];
      const pattern = detectContentPattern(attempts);
      expect(pattern).not.toBeNull();
      expect(pattern?.pattern).toContain('Persistent issue');
    });
  });

  describe('getEscalationMessage', () => {
    it('should return gentle message for first attempt', () => {
      const message = getEscalationMessage(1, 'soft');
      expect(message).toContain('review');
    });

    it('should return moderate message for second attempt', () => {
      const message = getEscalationMessage(2, 'moderate');
      expect(message).toContain('previous attempt');
    });

    it('should return strict message for third attempt', () => {
      const message = getEscalationMessage(3, 'strict');
      expect(message).toContain('manager');
    });

    it('should return manager approval message for fourth+ attempt', () => {
      const message = getEscalationMessage(4, 'manager-approval');
      expect(message).toContain('Manager approval');
    });
  });
});

