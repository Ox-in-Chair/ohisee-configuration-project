/**
 * Comprehensive Test Suite for TransparencyService
 * Target Coverage: >95%
 *
 * Tests:
 * - Validation decision explanations
 * - Supervisor insights generation
 * - Decision trace creation
 * - Regulatory report generation
 * - Plain language conversion
 * - Agent conflict detection
 */

import {
  TransparencyService,
  Explanation,
  SupervisorInsight,
  DecisionTrace,
} from '../transparency-service';
import type { ValidationResult, Requirement, ValidationError } from '../../types';
import type { AgentResult } from '../../multi-agent/types';

describe('TransparencyService', () => {
  let service: TransparencyService;

  beforeEach(() => {
    service = new TransparencyService();
  });

  describe('explainValidationDecision', () => {
    const mockValidationResult: ValidationResult = {
      valid: true,
      ready_for_submission: true,
      errors: [],
      quality_assessment: {
        score: 85,
        breakdown: {
          completeness: 25,
          accuracy: 22,
          clarity: 18,
          hazard_identification: 12,
          evidence: 8,
        },
        threshold_met: true,
      },
    };

    it('should generate explanation for requirement (pass)', () => {
      const requirement: Requirement = {
        field: 'corrective_action',
        message: 'Include verification method with timeline',
        reference: 'BRCGS 5.7.2',
        exampleFix: 'QA will verify on next batch (due 10-Oct)',
      };

      const result = service.explainValidationDecision('corrective_action', requirement, mockValidationResult);

      expect(result).toEqual({
        field: 'corrective_action',
        decision: 'pass',
        reason: expect.any(String),
        ruleReference: 'BRCGS 5.7.2',
        example: 'QA will verify on next batch (due 10-Oct)',
        confidence: 0.85, // score / 100
      });
    });

    it('should generate explanation for validation error (fail)', () => {
      const error: ValidationError = {
        field: 'nc_description',
        message: 'Description too short',
        severity: 'critical',
        brcgs_requirement: 'BRCGS 5.7.1',
      };

      const failedValidation: ValidationResult = {
        ...mockValidationResult,
        valid: false,
        quality_assessment: { ...mockValidationResult.quality_assessment, score: 65 },
      };

      const result = service.explainValidationDecision('nc_description', error, failedValidation);

      expect(result).toEqual({
        field: 'nc_description',
        decision: 'fail',
        reason: expect.any(String),
        ruleReference: 'BRCGS 5.7.1',
        example: undefined,
        confidence: 0.65,
      });
    });

    it('should generate warning for borderline quality score', () => {
      const requirement: Requirement = {
        field: 'root_cause_analysis',
        message: 'Root cause needs more depth',
        reference: 'BRCGS 5.7.3',
      };

      const warningValidation: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: { ...mockValidationResult.quality_assessment, score: 72 },
      };

      const result = service.explainValidationDecision('root_cause_analysis', requirement, warningValidation);

      expect(result.decision).toBe('warning');
      expect(result.confidence).toBe(0.72);
    });

    it('should use BRCGS requirement from error when reference not in requirement', () => {
      const error: ValidationError = {
        field: 'disposition',
        message: 'Disposition must be selected',
        brcgs_requirement: 'BRCGS 5.7.4',
      };

      const result = service.explainValidationDecision('disposition', error, mockValidationResult);

      expect(result.ruleReference).toBe('BRCGS 5.7.4');
    });

    it('should handle missing references gracefully', () => {
      const requirement: Requirement = {
        field: 'verification',
        message: 'Add verification details',
      };

      const result = service.explainValidationDecision('verification', requirement, mockValidationResult);

      expect(result.ruleReference).toBeUndefined();
      expect(result.example).toBeUndefined();
    });
  });

  describe('Plain Language Conversion', () => {
    const mockValidationResult: ValidationResult = {
      valid: false,
      ready_for_submission: false,
      errors: [],
      quality_assessment: {
        score: 70,
        breakdown: {
          completeness: 20,
          accuracy: 18,
          clarity: 15,
          hazard_identification: 10,
          evidence: 7,
        },
        threshold_met: false,
      },
    };

    it('should convert "too short" messages to plain language', () => {
      const requirement: Requirement = {
        field: 'nc_description',
        message: 'Description too short - minimum 100 characters required',
      };

      const result = service.explainValidationDecision('nc_description', requirement, mockValidationResult);

      expect(result.reason).toContain('needs more detail');
      expect(result.reason).toContain('complete record');
    });

    it('should convert "missing" messages to plain language', () => {
      const requirement: Requirement = {
        field: 'corrective_action',
        message: 'Missing required information',
      };

      const result = service.explainValidationDecision('corrective_action', requirement, mockValidationResult);

      expect(result.reason.toLowerCase()).toContain('missing');
    });

    it('should convert "too vague" messages to plain language', () => {
      const requirement: Requirement = {
        field: 'root_cause_analysis',
        message: 'Root cause too vague and generic',
      };

      const result = service.explainValidationDecision('root_cause_analysis', requirement, mockValidationResult);

      expect(result.reason).toContain('needs to be more specific');
      expect(result.reason).toContain('concrete details');
    });

    it('should convert 5-Why messages to plain language', () => {
      const requirement: Requirement = {
        field: 'root_cause_analysis',
        message: '5-Why analysis incomplete - need deeper root cause',
      };

      const result = service.explainValidationDecision('root_cause_analysis', requirement, mockValidationResult);

      expect(result.reason).toContain('root cause analysis needs more depth');
      expect(result.reason).toContain('ask "why" multiple times');
    });

    it('should convert procedure messages to plain language', () => {
      const requirement: Requirement = {
        field: 'corrective_action',
        message: 'Should reference relevant SOP or BRCGS procedure',
      };

      const result = service.explainValidationDecision('corrective_action', requirement, mockValidationResult);

      expect(result.reason).toContain('should reference relevant procedures');
      expect(result.reason).toContain('established guidelines');
    });

    it('should return original message if no pattern matches', () => {
      const requirement: Requirement = {
        field: 'custom_field',
        message: 'Custom validation message that does not match patterns',
      };

      const result = service.explainValidationDecision('custom_field', requirement, mockValidationResult);

      expect(result.reason).toBe('Custom validation message that does not match patterns');
    });
  });

  describe('generateSupervisorInsights', () => {
    const mockValidationResult: ValidationResult = {
      valid: false,
      ready_for_submission: false,
      errors: [
        {
          field: 'nc_description',
          message: 'Description too short',
          severity: 'critical',
        },
      ],
      requirements: [
        {
          field: 'root_cause_analysis',
          message: 'Root cause needs more depth',
        },
        {
          field: 'corrective_action',
          message: 'Add verification method',
        },
      ],
      quality_assessment: {
        score: 65,
        breakdown: {
          completeness: 18,
          accuracy: 16,
          clarity: 13,
          hazard_identification: 10,
          evidence: 8,
        },
        threshold_met: false,
      },
    };

    it('should generate supervisor insights for blocked submission', () => {
      const result = service.generateSupervisorInsights(mockValidationResult);

      expect(result.summary).toContain('Submission blocked');
      expect(result.summary).toContain('1 critical issue');
      expect(result.agentFindings).toEqual([]);
      // conflicts is empty array when no agents provided
      expect(result.conflicts).toEqual([]);
    });

    it('should generate insights for submission requiring improvement', () => {
      const validationWithRequirements: ValidationResult = {
        ...mockValidationResult,
        errors: [],
      };

      const result = service.generateSupervisorInsights(validationWithRequirements);

      expect(result.summary).toContain('Submission requires improvement');
      expect(result.summary).toContain('2 additional detail');
    });

    it('should generate insights for passed submission', () => {
      const passedValidation: ValidationResult = {
        valid: true,
        ready_for_submission: true,
        errors: [],
        quality_assessment: {
          score: 90,
          breakdown: {
            completeness: 27,
            accuracy: 23,
            clarity: 19,
            hazard_identification: 13,
            evidence: 8,
          },
          threshold_met: true,
        },
      };

      const result = service.generateSupervisorInsights(passedValidation);

      expect(result.summary).toBe('All validation checks passed. Submission meets quality standards.');
    });

    it('should include agent findings when provided', () => {
      const mockAgentTraces: Array<AgentResult & { agentName?: string }> = [
        {
          agentName: 'content-completion',
          errors: [{ field: 'nc_description', message: 'Too short' }],
          requirements: [],
          warnings: [],
          reasoning: 'Description lacks detail',
          confidence: 0.85,
        },
        {
          agentName: 'anomaly-detection',
          errors: [],
          requirements: [{ field: 'root_cause', message: 'Needs depth' }],
          warnings: [],
          reasoning: 'Root cause analysis insufficient',
          confidence: 0.78,
        },
      ];

      const result = service.generateSupervisorInsights(mockValidationResult, mockAgentTraces);

      expect(result.agentFindings).toHaveLength(2);
      expect(result.agentFindings[0]).toEqual({
        agentName: 'Content Completion Agent',
        findings: ['1 critical issue(s) found'],
        confidence: 0.85,
      });
      expect(result.agentFindings[1]).toEqual({
        agentName: 'Anomaly Detection Agent',
        findings: ['1 missing requirement(s) identified'],
        confidence: 0.78,
      });
    });

    it('should detect conflicts between agents', () => {
      const mockAgentTraces: Array<AgentResult & { agentName?: string }> = [
        {
          agentName: 'content-completion',
          errors: [],
          requirements: [{ field: 'corrective_action', message: 'Needs detail' }],
          warnings: [],
          reasoning: 'Agent 1 reasoning',
          confidence: 0.8,
        },
        {
          agentName: 'context-alignment',
          errors: [],
          requirements: [{ field: 'corrective_action', message: 'Different requirement' }],
          warnings: [],
          reasoning: 'Agent 2 reasoning',
          confidence: 0.75,
        },
      ];

      const result = service.generateSupervisorInsights(mockValidationResult, mockAgentTraces);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts![0]).toEqual({
        field: 'corrective_action',
        conflictingAgents: ['content-completion', 'context-alignment'],
        resolution: 'Resolved using priority-based conflict resolution',
      });
    });

    it('should handle agents with warnings only', () => {
      const mockAgentTraces: Array<AgentResult & { agentName?: string }> = [
        {
          agentName: 'anomaly-detection',
          errors: [],
          requirements: [],
          warnings: [
            { field: 'verification', message: 'Consider adding verification' },
            { field: 'timeline', message: 'Timeline could be more specific' },
          ],
          reasoning: 'Minor improvements suggested',
          confidence: 0.9,
        },
      ];

      const result = service.generateSupervisorInsights(mockValidationResult, mockAgentTraces);

      expect(result.agentFindings[0].findings).toContain('2 warning(s) raised');
    });

    it('should use default summary when no errors or requirements', () => {
      const ambiguousValidation: ValidationResult = {
        valid: false,
        ready_for_submission: false,
        errors: [],
        quality_assessment: {
          score: 50,
          breakdown: {
            completeness: 15,
            accuracy: 12,
            clarity: 10,
            hazard_identification: 8,
            evidence: 5,
          },
          threshold_met: false,
        },
      };

      const result = service.generateSupervisorInsights(ambiguousValidation);

      expect(result.summary).toBe('Submission requires review.');
    });
  });

  describe('createDecisionTrace', () => {
    const mockUserId = 'user-123';
    const mockValidationResult: ValidationResult = {
      valid: true,
      ready_for_submission: true,
      errors: [],
      requirements: [
        {
          field: 'verification',
          message: 'Add verification method',
          reference: 'BRCGS 5.7.2',
        },
      ],
      quality_assessment: {
        score: 80,
        breakdown: {
          completeness: 24,
          accuracy: 20,
          clarity: 16,
          hazard_identification: 12,
          evidence: 8,
        },
        threshold_met: true,
      },
    };

    it('should create decision trace for NCA', () => {
      const result = service.createDecisionTrace(
        'nca',
        'NCA-2025-001',
        mockUserId,
        mockValidationResult
      );

      expect(result).toEqual({
        timestamp: expect.any(Date),
        formType: 'nca',
        formId: 'NCA-2025-001',
        userId: mockUserId,
        validationResult: mockValidationResult,
        explanations: expect.arrayContaining([
          expect.objectContaining({
            field: 'requirements',
            decision: 'pass',
            confidence: 0.8,
          }),
        ]),
        agentTraces: undefined,
        policyVersion: '1.0.0',
      });
    });

    it('should create decision trace for MJC', () => {
      const result = service.createDecisionTrace(
        'mjc',
        'MJC-2025-042',
        mockUserId,
        mockValidationResult
      );

      expect(result.formType).toBe('mjc');
      expect(result.formId).toBe('MJC-2025-042');
    });

    it('should include agent traces when provided', () => {
      const mockAgentTraces: Array<AgentResult & { agentName?: string }> = [
        {
          agentName: 'content-completion',
          errors: [],
          requirements: [],
          warnings: [],
          reasoning: 'Content complete',
          confidence: 0.9,
        },
      ];

      const result = service.createDecisionTrace(
        'nca',
        'NCA-2025-001',
        mockUserId,
        mockValidationResult,
        mockAgentTraces
      );

      expect(result.agentTraces).toEqual(mockAgentTraces);
    });

    it('should use custom policy version', () => {
      const result = service.createDecisionTrace(
        'nca',
        'NCA-2025-001',
        mockUserId,
        mockValidationResult,
        undefined,
        '2.5.0'
      );

      expect(result.policyVersion).toBe('2.5.0');
    });

    it('should handle draft forms without formId', () => {
      const result = service.createDecisionTrace(
        'nca',
        undefined,
        mockUserId,
        mockValidationResult
      );

      expect(result.formId).toBeUndefined();
      expect(result.formType).toBe('nca');
    });

    it('should generate explanations for errors', () => {
      const validationWithErrors: ValidationResult = {
        valid: false,
        ready_for_submission: false,
        errors: [
          {
            field: 'nc_description',
            message: 'Description too short',
            severity: 'critical',
            brcgs_requirement: 'BRCGS 5.7.1',
          },
        ],
        quality_assessment: {
          score: 60,
          breakdown: {
            completeness: 18,
            accuracy: 15,
            clarity: 12,
            hazard_identification: 9,
            evidence: 6,
          },
          threshold_met: false,
        },
      };

      const result = service.createDecisionTrace(
        'nca',
        'NCA-2025-001',
        mockUserId,
        validationWithErrors
      );

      expect(result.explanations).toContainEqual(
        expect.objectContaining({
          field: 'errors',
          decision: 'fail',
        })
      );
    });

    it('should handle validation with no requirements or errors', () => {
      const minimalValidation: ValidationResult = {
        valid: true,
        ready_for_submission: true,
        errors: [],
        quality_assessment: {
          score: 100,
          breakdown: {
            completeness: 30,
            accuracy: 25,
            clarity: 20,
            hazard_identification: 15,
            evidence: 10,
          },
          threshold_met: true,
        },
      };

      const result = service.createDecisionTrace(
        'nca',
        'NCA-2025-001',
        mockUserId,
        minimalValidation
      );

      expect(result.explanations).toHaveLength(0);
    });
  });

  describe('generateRegulatoryReport', () => {
    it('should generate report for passed validation', () => {
      const decisionTrace: DecisionTrace = {
        timestamp: new Date('2025-11-12T10:30:00Z'),
        formType: 'nca',
        formId: 'NCA-2025-001',
        userId: 'user-123',
        validationResult: {
          valid: true,
          ready_for_submission: true,
          errors: [],
          quality_assessment: {
            score: 90,
            breakdown: {
              completeness: 27,
              accuracy: 23,
              clarity: 19,
              hazard_identification: 13,
              evidence: 8,
            },
            threshold_met: true,
          },
        },
        explanations: [],
        policyVersion: '2.1.0',
      };

      const report = service.generateRegulatoryReport(decisionTrace);

      expect(report).toContain('Report #NCA-2025-001: Validation Analysis');
      expect(report).toContain('Date: 2025-11-12');
      expect(report).toContain('Policy Version: 2.1.0');
      expect(report).toContain('Status: PASSED');
      expect(report).toContain('All validation checks passed');
    });

    it('should generate report for blocked submission', () => {
      const decisionTrace: DecisionTrace = {
        timestamp: new Date('2025-11-12T10:30:00Z'),
        formType: 'nca',
        formId: 'NCA-2025-002',
        userId: 'user-456',
        validationResult: {
          valid: false,
          ready_for_submission: false,
          errors: [],
          quality_assessment: {
            score: 65,
            breakdown: {
              completeness: 19,
              accuracy: 16,
              clarity: 13,
              hazard_identification: 10,
              evidence: 7,
            },
            threshold_met: false,
          },
        },
        explanations: [
          {
            field: 'nc_description',
            decision: 'fail',
            reason: 'Description needs more detail',
            ruleReference: 'BRCGS 5.7.1',
            confidence: 0.65,
          },
        ],
        policyVersion: '2.1.0',
      };

      const report = service.generateRegulatoryReport(decisionTrace);

      expect(report).toContain('Status: BLOCKED');
      expect(report).toContain('Submission requires improvement');
      expect(report).toContain('Validation Breakdown:');
      expect(report).toContain('- nc_description: FAIL');
      expect(report).toContain('Reason: Description needs more detail');
      expect(report).toContain('Reference: BRCGS 5.7.1');
    });

    it('should include agent analysis in report', () => {
      const decisionTrace: DecisionTrace = {
        timestamp: new Date('2025-11-12T10:30:00Z'),
        formType: 'nca',
        formId: 'NCA-2025-003',
        userId: 'user-789',
        validationResult: {
          valid: true,
          ready_for_submission: true,
          errors: [],
          quality_assessment: {
            score: 85,
            breakdown: {
              completeness: 25,
              accuracy: 21,
              clarity: 17,
              hazard_identification: 13,
              evidence: 9,
            },
            threshold_met: true,
          },
        },
        explanations: [],
        agentTraces: [
          {
            agentName: 'content-completion',
            errors: [],
            requirements: [],
            warnings: [],
            reasoning: 'All content sections complete and well-structured',
            confidence: 0.92,
          },
          {
            agentName: 'anomaly-detection',
            errors: [],
            requirements: [],
            warnings: [],
            reasoning: 'No anomalies detected in submission patterns',
            confidence: 0.88,
          },
        ],
        policyVersion: '2.1.0',
      };

      const report = service.generateRegulatoryReport(decisionTrace);

      expect(report).toContain('Agent Analysis:');
      expect(report).toContain('Content Completion Agent: All content sections complete and well-structured');
      expect(report).toContain('Anomaly Detection Agent: No anomalies detected in submission patterns');
    });

    it('should handle draft form without formId', () => {
      const decisionTrace: DecisionTrace = {
        timestamp: new Date('2025-11-12T10:30:00Z'),
        formType: 'mjc',
        formId: undefined,
        userId: 'user-999',
        validationResult: {
          valid: false,
          ready_for_submission: false,
          errors: [],
          quality_assessment: {
            score: 70,
            breakdown: {
              completeness: 21,
              accuracy: 17,
              clarity: 14,
              hazard_identification: 11,
              evidence: 7,
            },
            threshold_met: false,
          },
        },
        explanations: [],
        policyVersion: '1.0.0',
      };

      const report = service.generateRegulatoryReport(decisionTrace);

      expect(report).toContain('Report #DRAFT: Validation Analysis');
    });

    it('should format multiple explanations correctly', () => {
      const decisionTrace: DecisionTrace = {
        timestamp: new Date('2025-11-12T10:30:00Z'),
        formType: 'nca',
        formId: 'NCA-2025-004',
        userId: 'user-111',
        validationResult: {
          valid: false,
          ready_for_submission: false,
          errors: [],
          quality_assessment: {
            score: 68,
            breakdown: {
              completeness: 20,
              accuracy: 17,
              clarity: 13,
              hazard_identification: 10,
              evidence: 8,
            },
            threshold_met: false,
          },
        },
        explanations: [
          {
            field: 'nc_description',
            decision: 'warning',
            reason: 'Description could be more detailed',
            ruleReference: 'BRCGS 5.7.1',
            confidence: 0.72,
          },
          {
            field: 'root_cause_analysis',
            decision: 'fail',
            reason: 'Root cause analysis needs more depth',
            ruleReference: 'BRCGS 5.7.3',
            confidence: 0.68,
          },
          {
            field: 'corrective_action',
            decision: 'pass',
            reason: 'Corrective action is well-defined',
            confidence: 0.85,
          },
        ],
        policyVersion: '2.1.0',
      };

      const report = service.generateRegulatoryReport(decisionTrace);

      expect(report).toContain('- nc_description: WARNING');
      expect(report).toContain('- root_cause_analysis: FAIL');
      expect(report).toContain('- corrective_action: PASS');
      expect(report.split('\n').filter(line => line.startsWith('-')).length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown agent names', () => {
      const mockAgentTraces: Array<AgentResult & { agentName?: string }> = [
        {
          agentName: 'unknown-agent-xyz',
          errors: [],
          requirements: [],
          warnings: [],
          reasoning: 'Test reasoning',
          confidence: 0.8,
        },
      ];

      const mockValidationResult: ValidationResult = {
        valid: true,
        ready_for_submission: true,
        errors: [],
        quality_assessment: {
          score: 80,
          breakdown: {
            completeness: 24,
            accuracy: 20,
            clarity: 16,
            hazard_identification: 12,
            evidence: 8,
          },
          threshold_met: true,
        },
      };

      const result = service.generateSupervisorInsights(mockValidationResult, mockAgentTraces);

      expect(result.agentFindings[0].agentName).toBe('unknown-agent-xyz');
    });

    it('should handle empty agent traces array', () => {
      const mockValidationResult: ValidationResult = {
        valid: true,
        ready_for_submission: true,
        errors: [],
        quality_assessment: {
          score: 80,
          breakdown: {
            completeness: 24,
            accuracy: 20,
            clarity: 16,
            hazard_identification: 12,
            evidence: 8,
          },
          threshold_met: true,
        },
      };

      const result = service.generateSupervisorInsights(mockValidationResult, []);

      expect(result.agentFindings).toEqual([]);
      // conflicts is empty array when no conflicts detected
      expect(result.conflicts).toEqual([]);
    });

    it('should handle very long validation messages', () => {
      const longMessage = 'A'.repeat(1000);
      const requirement: Requirement = {
        field: 'test_field',
        message: longMessage,
      };

      const mockValidationResult: ValidationResult = {
        valid: false,
        ready_for_submission: false,
        errors: [],
        quality_assessment: {
          score: 70,
          breakdown: {
            completeness: 21,
            accuracy: 17,
            clarity: 14,
            hazard_identification: 11,
            evidence: 7,
          },
          threshold_met: false,
        },
      };

      const result = service.explainValidationDecision('test_field', requirement, mockValidationResult);

      // Should not throw and should return the message
      expect(result.reason).toBe(longMessage);
    });
  });
});
