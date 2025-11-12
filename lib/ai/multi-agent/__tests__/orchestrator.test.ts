/**
 * Multi-Agent Orchestrator Unit Tests
 * Comprehensive test coverage for agent coordination, conflict resolution, and parallel execution
 * Target: >95% coverage
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MultiAgentOrchestrator } from '../orchestrator';
import type { NCA, MJC, User, ValidationResult } from '../../types';
import type { AgentResult } from '../types';

// Mock the agent classes
jest.mock('../agents/content-completion-agent');
jest.mock('../agents/anomaly-detection-agent');
jest.mock('../agents/context-alignment-agent');

import { ContentCompletionAgent } from '../agents/content-completion-agent';
import { AnomalyDetectionAgent } from '../agents/anomaly-detection-agent';
import { ContextAlignmentAgent } from '../agents/context-alignment-agent';

describe('MultiAgentOrchestrator', () => {
  let orchestrator: MultiAgentOrchestrator;
  let mockUser: User;
  let mockNCA: NCA;
  let mockMJC: MJC;

  beforeEach(() => {
    jest.clearAllMocks();

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
      description_required: 'Machine stopped unexpectedly during production run. Error code E-403 displayed on control panel.',
      maintenance_category: 'reactive',
      maintenance_type_electrical: true,
      maintenance_type_mechanical: false,
      maintenance_type_pneumatical: false,
      machine_status: 'down',
      urgency: 'critical',
      temporary_repair: false,
      machine_equipment: 'Laminator-01',
      maintenance_performed: 'Replaced faulty relay. Tested all electrical connections. Verified operation with test run.',
    };
  });

  describe('constructor', () => {
    it('should initialize with default config (all agents enabled)', () => {
      orchestrator = new MultiAgentOrchestrator();
      expect(orchestrator).toBeDefined();
    });

    it('should initialize with custom config', () => {
      orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: false,
        enableAnomalyDetection: true,
        enableContextAlignment: true,
        parallelExecution: true,
        conflictResolution: 'consensus',
      });
      expect(orchestrator).toBeDefined();
    });

    it('should initialize with all agents disabled', () => {
      orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: false,
        enableAnomalyDetection: false,
        enableContextAlignment: false,
      });
      expect(orchestrator).toBeDefined();
    });
  });

  describe('validateSubmission - Basic Functionality', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it('should return default validation when no agents enabled', async () => {
      orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: false,
        enableAnomalyDetection: false,
        enableContextAlignment: false,
      });

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result).toMatchObject({
        valid: true,
        ready_for_submission: true,
        quality_assessment: {
          score: 75,
          threshold_met: true,
        },
        errors: [],
      });
    });

    it('should execute all enabled agents in parallel', async () => {
      const mockContentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content completion analysis complete',
      };

      const mockAnomalyResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly detection analysis complete',
      };

      const mockAlignmentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Context alignment analysis complete',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockContentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockAnomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockAlignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(ContentCompletionAgent.prototype.analyze).toHaveBeenCalledWith(mockNCA, mockUser, 'nca');
      expect(AnomalyDetectionAgent.prototype.analyze).toHaveBeenCalledWith(mockNCA, mockUser, 'nca');
      expect(ContextAlignmentAgent.prototype.analyze).toHaveBeenCalledWith(mockNCA, mockUser, 'nca');

      // Calculate expected average confidence: (0.8 + 0.7 + 0.75) / 3 = 0.75
      expect(result.quality_assessment.score).toBe(75);
      expect(result.valid).toBe(true);
      expect(result.ready_for_submission).toBe(true);
    });

    it('should work with MJC form type', async () => {
      const mockContentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content completion analysis complete',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockContentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockContentResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockContentResult);

      const result = await orchestrator.validateSubmission(mockMJC, mockUser, 'mjc');

      expect(ContentCompletionAgent.prototype.analyze).toHaveBeenCalledWith(mockMJC, mockUser, 'mjc');
      expect(result).toBeDefined();
    });
  });

  describe('validateSubmission - Agent Findings Aggregation', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it('should aggregate requirements from all agents', async () => {
      const contentResult: AgentResult = {
        requirements: [
          { field: 'nc_description', message: 'Missing batch number', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      const anomalyResult: AgentResult = {
        requirements: [
          { field: 'root_cause_analysis', message: 'Quantity seems unusually high', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      const alignmentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(contentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(anomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(alignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.requirements).toHaveLength(2);
      expect(result.requirements).toContainEqual(
        expect.objectContaining({ field: 'nc_description', message: 'Missing batch number' })
      );
      expect(result.requirements).toContainEqual(
        expect.objectContaining({ field: 'root_cause_analysis', message: 'Quantity seems unusually high' })
      );
    });

    it('should aggregate errors from all agents', async () => {
      const contentResult: AgentResult = {
        requirements: [],
        errors: [
          { field: 'nc_description', message: 'Description too short', brcgs_requirement: 'BRCGS 5.7.2' },
        ],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      const anomalyResult: AgentResult = {
        requirements: [],
        errors: [
          { field: 'nc_type', message: 'Type does not match description', brcgs_requirement: 'BRCGS 5.7.1' },
        ],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      const alignmentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(contentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(anomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(alignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.errors).toHaveLength(2);
      expect(result.valid).toBe(false); // Has errors
      expect(result.ready_for_submission).toBe(false);
    });

    it('should aggregate warnings from all agents', async () => {
      const contentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [
          { field: 'nc_description', message: 'Consider adding more details', suggestion: 'Add time of occurrence' },
        ],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      const anomalyResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [
          { field: 'root_cause_analysis', message: 'Frequency is above normal', suggestion: 'Check for systemic issues' },
        ],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      const alignmentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(contentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(anomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(alignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.warnings).toHaveLength(2);
    });

    it('should calculate quality score from average confidence', async () => {
      const highConfidenceResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.9,
        reasoning: 'High confidence',
      };

      const mediumConfidenceResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.6,
        reasoning: 'Medium confidence',
      };

      const lowConfidenceResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.3,
        reasoning: 'Low confidence',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(highConfidenceResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mediumConfidenceResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(lowConfidenceResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // (0.9 + 0.6 + 0.3) / 3 = 0.6 = 60%
      expect(result.quality_assessment.score).toBe(60);
      expect(result.quality_assessment.threshold_met).toBe(false); // Below 75%
    });

    it('should mark invalid when quality score below 75', async () => {
      const lowConfidenceResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.5,
        reasoning: 'Low confidence',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(lowConfidenceResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(lowConfidenceResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(lowConfidenceResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.quality_assessment.score).toBe(50);
      expect(result.valid).toBe(false);
      expect(result.ready_for_submission).toBe(false);
    });
  });

  describe('validateSubmission - Error Handling', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it('should gracefully handle agent failure', async () => {
      const goodResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Success',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockRejectedValue(new Error('Agent failed'));
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(goodResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(goodResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // Should still complete with remaining agents
      expect(result).toBeDefined();
      expect(result.valid).toBe(true); // No errors from successful agents
    });

    it('should continue execution when one agent throws', async () => {
      const goodResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Success',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(goodResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockRejectedValue(new Error('Network timeout'));
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(goodResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // Should complete with 2 successful agents
      // (0.8 + 0 + 0.8) / 3 = 0.533 = 53% (failed agent has confidence 0)
      expect(result.quality_assessment.score).toBe(53);
    });

    it('should handle all agents failing', async () => {
      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockRejectedValue(new Error('Failed'));
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockRejectedValue(new Error('Failed'));
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // All agents failed, average confidence = 0
      expect(result.quality_assessment.score).toBe(0);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSubmission - Selective Agent Execution', () => {
    it('should only execute content completion agent when others disabled', async () => {
      orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: true,
        enableAnomalyDetection: false,
        enableContextAlignment: false,
      });

      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(ContentCompletionAgent.prototype.analyze).toHaveBeenCalled();
      expect(AnomalyDetectionAgent.prototype.analyze).not.toHaveBeenCalled();
      expect(ContextAlignmentAgent.prototype.analyze).not.toHaveBeenCalled();
      expect(result.quality_assessment.score).toBe(80); // Single agent confidence
    });

    it('should only execute anomaly detection agent when others disabled', async () => {
      orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: false,
        enableAnomalyDetection: true,
        enableContextAlignment: false,
      });

      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(ContentCompletionAgent.prototype.analyze).not.toHaveBeenCalled();
      expect(AnomalyDetectionAgent.prototype.analyze).toHaveBeenCalled();
      expect(ContextAlignmentAgent.prototype.analyze).not.toHaveBeenCalled();
      expect(result.quality_assessment.score).toBe(70);
    });

    it('should only execute context alignment agent when others disabled', async () => {
      orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: false,
        enableAnomalyDetection: false,
        enableContextAlignment: true,
      });

      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(ContentCompletionAgent.prototype.analyze).not.toHaveBeenCalled();
      expect(AnomalyDetectionAgent.prototype.analyze).not.toHaveBeenCalled();
      expect(ContextAlignmentAgent.prototype.analyze).toHaveBeenCalled();
      expect(result.quality_assessment.score).toBe(75);
    });
  });

  describe('Conflict Detection and Resolution', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator({
        conflictResolution: 'priority',
      });
    });

    it('should detect conflicts when agents disagree on same field', async () => {
      const contentResult: AgentResult = {
        requirements: [
          { field: 'nc_description', message: 'Add more details', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      const anomalyResult: AgentResult = {
        requirements: [],
        errors: [
          { field: 'nc_description', message: 'Description is too long', brcgs_requirement: 'BRCGS 5.7.2' },
        ],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      const alignmentResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(contentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(anomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(alignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // Should detect conflict on nc_description field
      // Priority resolution: anomaly-detection wins (error severity)
      expect(result.errors.some((e) => e.field === 'nc_description')).toBe(true);
    });

    it('should resolve conflicts using priority strategy (context-alignment > anomaly-detection > content-completion)', async () => {
      orchestrator = new MultiAgentOrchestrator({
        conflictResolution: 'priority',
      });

      const contentResult: AgentResult = {
        requirements: [
          { field: 'root_cause_analysis', message: 'Content says add more', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      const anomalyResult: AgentResult = {
        requirements: [
          { field: 'root_cause_analysis', message: 'Anomaly says check frequency', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      const alignmentResult: AgentResult = {
        requirements: [
          { field: 'root_cause_analysis', message: 'Alignment says fix logic', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(contentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(anomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(alignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // Context alignment has highest priority
      const rootCauseReqs = result.requirements.filter((r) => r.field === 'root_cause_analysis');
      expect(rootCauseReqs.some((r) => r.message === 'Alignment says fix logic')).toBe(true);
    });

    it('should resolve conflicts using consensus strategy', async () => {
      orchestrator = new MultiAgentOrchestrator({
        conflictResolution: 'consensus',
      });

      const contentResult: AgentResult = {
        requirements: [
          { field: 'corrective_action', message: 'Add verification method', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Content check',
      };

      const anomalyResult: AgentResult = {
        requirements: [
          { field: 'corrective_action', message: 'Add verification method', reference: 'BRCGS 5.7.2' },
        ],
        errors: [],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Anomaly check',
      };

      const alignmentResult: AgentResult = {
        requirements: [],
        errors: [
          { field: 'corrective_action', message: 'Action does not address root cause', brcgs_requirement: 'BRCGS 5.7.2' },
        ],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Alignment check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(contentResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(anomalyResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(alignmentResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      // Consensus: 2 agents say requirement (wins), 1 says error
      const actionReqs = result.requirements.filter((r) => r.field === 'corrective_action');
      expect(actionReqs.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Assessment Breakdown', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it('should calculate quality breakdown proportionally', async () => {
      const highConfidenceResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.9,
        reasoning: 'High confidence',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(highConfidenceResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(highConfidenceResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(highConfidenceResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.quality_assessment.score).toBe(90);
      expect(result.quality_assessment.breakdown).toMatchObject({
        completeness: 27, // 30% of 90
        accuracy: 23, // 25% of 90 (rounded)
        clarity: 18, // 20% of 90
        hazard_identification: 14, // 15% of 90 (rounded)
        evidence: 9, // 10% of 90
      });
    });

    it('should indicate threshold met when score >= 75', async () => {
      const passingResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.75,
        reasoning: 'Passing',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(passingResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(passingResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(passingResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.quality_assessment.score).toBe(75);
      expect(result.quality_assessment.threshold_met).toBe(true);
    });

    it('should indicate threshold not met when score < 75', async () => {
      const failingResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.7,
        reasoning: 'Failing',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(failingResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(failingResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(failingResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result.quality_assessment.score).toBe(70);
      expect(result.quality_assessment.threshold_met).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it('should handle empty form data', async () => {
      const emptyNCA: Partial<NCA> = {
        nca_id: 'NCA-EMPTY',
        nc_description: '',
        nc_type: 'other',
        machine_status: 'operational',
        cross_contamination: false,
        disposition_rework: false,
        disposition_concession: false,
      };

      const mockResult: AgentResult = {
        requirements: [],
        errors: [{ field: 'nc_description', message: 'Description is required' }],
        warnings: [],
        confidence: 0.9,
        reasoning: 'Validation check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      const result = await orchestrator.validateSubmission(emptyNCA as NCA, mockUser, 'nca');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);
    });

    it('should handle null/undefined user gracefully', async () => {
      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Check complete',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      // TypeScript should prevent this, but test runtime handling
      const result = await orchestrator.validateSubmission(mockNCA, null as any, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle very long agent reasoning strings', async () => {
      const longReasoning = 'A'.repeat(10000); // 10KB string
      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: longReasoning,
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      const result = await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');

      expect(result).toBeDefined();
      expect(result.quality_assessment.score).toBe(80);
    });

    it('should handle form with all optional fields filled', async () => {
      const completeNCA: NCA = {
        ...mockNCA,
        nc_type_other: 'Custom type',
        machine_down_since: '2024-10-01T08:00:00Z',
      };

      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.95,
        reasoning: 'Complete data',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      const result = await orchestrator.validateSubmission(completeNCA, mockUser, 'nca');

      expect(result.quality_assessment.score).toBe(95);
      expect(result.valid).toBe(true);
    });
  });

  describe('Performance and Concurrency', () => {
    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it('should execute agents in parallel (not sequential)', async () => {
      const executionOrder: string[] = [];

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push('content');
        return {
          requirements: [],
          errors: [],
          warnings: [],
          confidence: 0.8,
          reasoning: 'Content',
        };
      });

      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        executionOrder.push('anomaly');
        return {
          requirements: [],
          errors: [],
          warnings: [],
          confidence: 0.7,
          reasoning: 'Anomaly',
        };
      });

      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        executionOrder.push('alignment');
        return {
          requirements: [],
          errors: [],
          warnings: [],
          confidence: 0.75,
          reasoning: 'Alignment',
        };
      });

      const startTime = Date.now();
      await orchestrator.validateSubmission(mockNCA, mockUser, 'nca');
      const endTime = Date.now();

      // If parallel, should complete in ~50ms (longest task)
      // If sequential, would take 50+30+20=100ms
      expect(endTime - startTime).toBeLessThan(100);

      // Fastest agent should finish first
      expect(executionOrder[0]).toBe('alignment');
    });

    it('should handle rapid successive calls', async () => {
      const mockResult: AgentResult = {
        requirements: [],
        errors: [],
        warnings: [],
        confidence: 0.8,
        reasoning: 'Quick check',
      };

      (ContentCompletionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (AnomalyDetectionAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);
      (ContextAlignmentAgent.prototype.analyze as jest.Mock).mockResolvedValue(mockResult);

      // Execute 10 validations in rapid succession
      const promises = Array.from({ length: 10 }, () =>
        orchestrator.validateSubmission(mockNCA, mockUser, 'nca')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.quality_assessment.score).toBe(80);
      });
    });
  });
});
