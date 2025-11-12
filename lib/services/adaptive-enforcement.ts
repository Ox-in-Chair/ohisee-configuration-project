/**
 * Adaptive Enforcement Service
 * Implements progressive escalation logic for quality enforcement
 * Tracks submission attempts and adapts enforcement level based on user behavior
 */

import type { ValidationResult as EnforcementValidationResult, ValidationIssue } from './quality-enforcement-service';
import type { Requirement } from '@/lib/ai/types';

export interface EnforcementAttempt {
  userId: string;
  formType: 'nca' | 'mjc';
  formId?: string; // Optional: if form has been saved
  attemptNumber: number;
  timestamp: Date;
  validationResult: EnforcementValidationResult;
  issues: ValidationIssue[];
}

export interface UserEnforcementPattern {
  userId: string;
  totalAttempts: number;
  averageAttemptsPerForm: number;
  frequentIssues: string[]; // Most common validation issues
  lastAttemptDate: Date;
  escalationTriggered: boolean;
}

export interface AdaptiveEnforcementResult {
  enforcementLevel: 'soft' | 'moderate' | 'strict' | 'manager-approval';
  requirements: Requirement[];
  errors: Array<{ field: string; message: string; brcgs_requirement?: string | undefined }>;
  warnings?: Array<{ field: string; message: string; suggestion?: string | undefined }> | undefined;
  escalationReason?: string | undefined;
  requiresManagerApproval: boolean;
}

/**
 * Determine enforcement level based on attempt number
 */
export function getEnforcementLevel(attemptNumber: number): 'soft' | 'moderate' | 'strict' | 'manager-approval' {
  if (attemptNumber === 1) return 'soft';
  if (attemptNumber === 2) return 'moderate';
  if (attemptNumber === 3) return 'strict';
  return 'manager-approval'; // 4+ attempts
}

/**
 * Convert validation issues to requirements/errors based on enforcement level
 */
export function adaptValidationToEnforcementLevel(
  issues: ValidationIssue[],
  attemptNumber: number
): AdaptiveEnforcementResult {
  const enforcementLevel = getEnforcementLevel(attemptNumber);
  const requirements: Requirement[] = [];
  const errors: Array<{ field: string; message: string; brcgs_requirement?: string }> = [];
  const warnings: Array<{ field: string; message: string; suggestion?: string }> = [];

  issues.forEach((issue) => {
    if (enforcementLevel === 'soft') {
      // First attempt: All issues as warnings/requirements (non-blocking)
      if (issue.severity === 'error') {
        // Convert errors to requirements on first attempt
        requirements.push({
          field: issue.field,
          message: issue.message,
          ...(issue.brcgsReference && { reference: issue.brcgsReference }),
          ...(issue.exampleFix && { exampleFix: issue.exampleFix }),
        });
      } else {
        requirements.push({
          field: issue.field,
          message: issue.message,
          ...(issue.brcgsReference && { reference: issue.brcgsReference }),
          ...(issue.exampleFix && { exampleFix: issue.exampleFix }),
        });
      }
    } else if (enforcementLevel === 'moderate') {
      // Second attempt: Escalate previous requirements to errors if still present
      if (issue.severity === 'error') {
        errors.push({
          field: issue.field,
          message: `${issue.message} This is required for compliance.`,
          ...(issue.brcgsReference && { brcgs_requirement: issue.brcgsReference }),
        });
      } else {
        // Warnings become requirements
        requirements.push({
          field: issue.field,
          message: `${issue.message} Please address this before submitting.`,
          ...(issue.brcgsReference && { reference: issue.brcgsReference }),
          ...(issue.exampleFix && { exampleFix: issue.exampleFix }),
        });
      }
    } else if (enforcementLevel === 'strict') {
      // Third attempt: All issues become errors
      errors.push({
        field: issue.field,
        message: `${issue.message} This must be addressed before submission.`,
        ...(issue.brcgsReference && { brcgs_requirement: issue.brcgsReference }),
      });
    } else {
      // Fourth+ attempt: Manager approval required
      errors.push({
        field: issue.field,
        message: `${issue.message} Manager approval will be required to proceed.`,
        ...(issue.brcgsReference && { brcgs_requirement: issue.brcgsReference }),
      });
    }
  });

  return {
    enforcementLevel,
    requirements: enforcementLevel !== 'manager-approval' ? requirements : [],
    errors,
    warnings: enforcementLevel === 'soft' ? warnings : undefined,
    escalationReason:
      attemptNumber > 1
        ? `This is attempt ${attemptNumber}. Previous attempts had similar issues that need to be addressed.`
        : undefined,
    requiresManagerApproval: enforcementLevel === 'manager-approval',
  };
}

/**
 * Detect user patterns for management reporting
 */
export function analyzeUserPattern(attempts: EnforcementAttempt[]): UserEnforcementPattern {
  if (attempts.length === 0) {
    throw new Error('Cannot analyze pattern from empty attempts array');
  }

  const userId = attempts[0].userId;
  const formType = attempts[0].formType;

  // Count issues by field
  const issueCounts: Record<string, number> = {};
  attempts.forEach((attempt) => {
    attempt.issues.forEach((issue) => {
      issueCounts[issue.field] = (issueCounts[issue.field] || 0) + 1;
    });
  });

  // Get most frequent issues
  const frequentIssues = Object.entries(issueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([field]) => field);

  // Calculate average attempts per form (if we had form grouping)
  const uniqueForms = new Set(attempts.map((a) => a.formId).filter(Boolean));
  const averageAttemptsPerForm =
    uniqueForms.size > 0 ? attempts.length / uniqueForms.size : attempts.length;

  return {
    userId,
    totalAttempts: attempts.length,
    averageAttemptsPerForm,
    frequentIssues,
    lastAttemptDate: attempts[attempts.length - 1].timestamp,
    escalationTriggered: attempts.some((a) => a.attemptNumber >= 3),
  };
}

/**
 * Check if content pattern suggests rule adjustment needed
 */
export function detectContentPattern(
  attempts: EnforcementAttempt[]
): { pattern: string; suggestion: string } | null {
  if (attempts.length < 3) return null;

  // Check if same issue persists across attempts
  const persistentIssues = new Map<string, number>();
  attempts.forEach((attempt) => {
    attempt.issues.forEach((issue) => {
      const key = `${issue.field}:${issue.message}`;
      persistentIssues.set(key, (persistentIssues.get(key) || 0) + 1);
    });
  });

  // If an issue appears in 80%+ of attempts, it might indicate unclear requirements
  const threshold = attempts.length * 0.8;
  for (const [issueKey, count] of persistentIssues.entries()) {
    if (count >= threshold) {
      const [field] = issueKey.split(':');
      return {
        pattern: `Persistent issue: ${field}`,
        suggestion: `Consider making the requirement for "${field}" more prominent in placeholders or adjusting validation rules if this is a common pattern.`,
      };
    }
  }

  return null;
}

/**
 * Generate escalation message for user
 */
export function getEscalationMessage(attemptNumber: number, _enforcementLevel: string): string {
  if (attemptNumber === 1) {
    return 'Please review the requirements below and update your submission.';
  }
  if (attemptNumber === 2) {
    return 'Some requirements from your previous attempt still need attention. Please address these before submitting.';
  }
  if (attemptNumber === 3) {
    return 'This submission still does not meet requirements. A manager\'s approval will be needed to proceed.';
  }
  return 'Manager approval is required for this submission.';
}

