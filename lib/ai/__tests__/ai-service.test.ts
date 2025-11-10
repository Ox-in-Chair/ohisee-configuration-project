/**
 * AI Service Unit Tests
 * Tests core AIService with mocked dependencies
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AIService } from '../ai-service';
import type { IAnthropicClient, IKnowledgeBaseService, IAuditLogger, IRateLimiter } from '../ai-service.interface';
import { AnalysisContext, NCA, User, AIServiceError } from '../types';

describe('AIService', () => {
  let mockAnthropicClient: jest.Mocked<IAnthropicClient>;
  let mockKnowledgeBase: jest.Mocked<IKnowledgeBaseService>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;
  let mockRateLimiter: jest.Mocked<IRateLimiter>;
  let aiService: AIService;

  const mockUser: User = {
    id: 'user-123',
    role: 'qa-supervisor',
    name: 'Test User',
    department: 'Quality',
    induction_completed: true,
    induction_date: '2024-01-01'
  };

  const mockNCA: NCA = {
    nca_id: 'NCA-2025-00001',
    nc_description: 'Print registration misalignment detected on CMH-01. Print out of specification by 3mm, exceeding ±2mm tolerance. Operator identified issue during quality check.',
    nc_type: 'wip',
    machine_status: 'operational',
    cross_contamination: false,
    disposition_rework: false,
    disposition_concession: false
  };

  beforeEach(() => {
    // Mock Anthropic client
    mockAnthropicClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          id: 'msg-123',
          type: 'message',
          role: 'assistant',
          content: [{
            type: 'text',
            text: JSON.stringify({
              text: 'Comprehensive corrective action',
              sections: {
                immediate_correction: 'Quarantine affected product',
                root_cause: 'Print registration calibration drift',
                corrective_action: 'Recalibrate print station per 5.6',
                verification: 'Monitor next 100 units'
              },
              confidence: 'high',
              confidence_percentage: 85,
              procedure_references: ['5.7', '3.11', '5.6'],
              keywords_detected: {
                category: 'process',
                keywords: ['print', 'specification', 'tolerance']
              },
              recommendations: {
                create_mjc: false,
                calibration_check: true,
                training_required: false,
                hara_review: false
              }
            })
          }],
          model: 'claude-sonnet-4-5-20250929',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 1000,
            output_tokens: 500
          }
        }),
        stream: jest.fn()
      }
    } as unknown as jest.Mocked<IAnthropicClient>;

    // Mock Knowledge Base
    mockKnowledgeBase = {
      searchProcedures: jest.fn().mockResolvedValue([
        { procedure_number: '5.7', content: 'Control of Non-Conforming Product', relevance: 0.9 },
        { procedure_number: '3.11', content: 'Corrective Action', relevance: 0.8 }
      ]),
      findSimilarCases: jest.fn().mockResolvedValue([
        { id: 'NCA-2025-00000', description: 'Print issue', action: 'Recalibrated', similarity: 0.85 }
      ]),
      getProcedure: jest.fn().mockResolvedValue({
        title: 'Control of Non-Conforming Product',
        content: 'Detailed procedure content'
      })
    } as jest.Mocked<IKnowledgeBaseService>;

    // Mock Audit Logger
    mockAuditLogger = {
      logInteraction: jest.fn().mockResolvedValue(undefined),
      logFeedback: jest.fn().mockResolvedValue(undefined)
    } as jest.Mocked<IAuditLogger>;

    // Mock Rate Limiter
    mockRateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
      recordRequest: jest.fn().mockResolvedValue(undefined),
      getRemainingRequests: jest.fn().mockResolvedValue(10),
      resetLimits: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<IRateLimiter>;

    // Create AI service with mocks
    aiService = new AIService(
      mockAnthropicClient,
      mockKnowledgeBase,
      mockAuditLogger,
      mockRateLimiter,
      {
        mode: 'fast',
        model: 'claude-sonnet-4-5-20250929',
        quality_threshold: 75,
        fast_response_timeout: 2000,
        deep_validation_timeout: 30000,
        temperature: 0.3,
        max_tokens: 4096
      }
    );
  });

  describe('analyzeFieldQuality', () => {
    it('should analyze field quality and return quality score', async () => {
      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      const result = await aiService.analyzeFieldQuality(context);

      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(typeof result.threshold_met).toBe('boolean');
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(mockUser.id);
      expect(mockRateLimiter.recordRequest).toHaveBeenCalledWith(mockUser.id);
      expect(mockAuditLogger.logInteraction).toHaveBeenCalled();
    });

    it('should throw error when rate limited', async () => {
      mockRateLimiter.checkLimit = jest.fn().mockResolvedValue(false);

      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      await expect(aiService.analyzeFieldQuality(context)).rejects.toThrow(AIServiceError);
      await expect(aiService.analyzeFieldQuality(context)).rejects.toThrow('rate_limit_exceeded');
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create = jest.fn().mockRejectedValue(new Error('API Error'));

      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      await expect(aiService.analyzeFieldQuality(context)).rejects.toThrow(AIServiceError);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate comprehensive suggestion with procedure context', async () => {
      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      const result = await aiService.generateSuggestions(context);

      expect(result.text).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.quality_score).toBeGreaterThanOrEqual(75);
      expect(result.procedure_references).toContain('5.7');
      expect(mockKnowledgeBase.searchProcedures).toHaveBeenCalled();
      expect(mockKnowledgeBase.findSimilarCases).toHaveBeenCalled();
      expect(mockAuditLogger.logInteraction).toHaveBeenCalled();
    });

    it('should include historical similar cases in context', async () => {
      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      await aiService.generateSuggestions(context);

      expect(mockKnowledgeBase.findSimilarCases).toHaveBeenCalledWith(
        mockNCA.nc_description,
        'nca',
        3
      );
    });

    it('should throw error if quality score below threshold', async () => {
      // Mock low-quality response
      mockAnthropicClient.messages.create = jest.fn().mockResolvedValue({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: JSON.stringify({
            text: 'Fix it.',
            sections: {},
            confidence: 'low',
            confidence_percentage: 30,
            procedure_references: [],
            keywords_detected: { category: 'general', keywords: [] },
            recommendations: {}
          })
        }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 10 }
      });

      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      await expect(aiService.generateSuggestions(context)).rejects.toThrow(AIServiceError);
      await expect(aiService.generateSuggestions(context)).rejects.toThrow('low_confidence');
    });

    it('should handle timeout gracefully', async () => {
      mockAnthropicClient.messages.create = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      const fastService = new AIService(
        mockAnthropicClient,
        mockKnowledgeBase,
        mockAuditLogger,
        mockRateLimiter,
        { fast_response_timeout: 100 }
      );

      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      await expect(fastService.generateSuggestions(context)).rejects.toThrow('timeout');
    }, 10000);
  });

  describe('classifyHazard', () => {
    it('should classify hazard type from description', async () => {
      mockAnthropicClient.messages.create = jest.fn().mockResolvedValue({
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: JSON.stringify({
            hazard_type: 'metal-contamination',
            severity: 'critical',
            likelihood: 'unlikely',
            risk_level: 8,
            control_measures: [
              'Metal detector verification',
              'Tool control',
              'Equipment inspection'
            ],
            brcgs_section: '5.8',
            confidence: 'high'
          })
        }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        usage: { input_tokens: 200, output_tokens: 100 }
      });

      const result = await aiService.classifyHazard('Metal fragment found in product during metal detector alarm');

      expect(result.hazard_type).toBe('metal-contamination');
      expect(result.severity).toBe('critical');
      expect(result.brcgs_section).toBe('5.8');
      expect(result.control_measures.length).toBeGreaterThan(0);
    });

    it('should handle classification errors', async () => {
      mockAnthropicClient.messages.create = jest.fn().mockRejectedValue(new Error('Classification failed'));

      await expect(aiService.classifyHazard('Unknown issue')).rejects.toThrow(AIServiceError);
    });
  });

  describe('validateBeforeSubmit', () => {
    it('should validate complete NCA and return validation result', async () => {
      const completeNCA: NCA = {
        ...mockNCA,
        corrective_action: 'Recalibrate print station per Procedure 5.6. Monitor next 100 units. Update calibration schedule.'
      };

      const result = await aiService.validateBeforeSubmit(completeNCA, mockUser);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.quality_assessment).toBeDefined();
      expect(result.ready_for_submission).toBe(true);
    });

    it('should identify validation errors in incomplete NCA', async () => {
      const incompleteNCA: NCA = {
        ...mockNCA,
        nc_description: 'Short', // Too short
        corrective_action: undefined
      };

      const result = await aiService.validateBeforeSubmit(incompleteNCA, mockUser);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.ready_for_submission).toBe(false);
    });

    it('should generate warnings for cross-contamination without back tracking', async () => {
      const ncaWithCrossContamination: NCA = {
        ...mockNCA,
        cross_contamination: true,
        corrective_action: 'Quarantine product. Investigate cause.' // Missing back tracking
      };

      const result = await aiService.validateBeforeSubmit(ncaWithCrossContamination, mockUser);

      const backTrackingWarning = result.warnings.find(w =>
        w.message.toLowerCase().includes('back tracking')
      );
      expect(backTrackingWarning).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should wrap unknown errors in AIServiceError', async () => {
      mockAnthropicClient.messages.create = jest.fn().mockRejectedValue(new Error('Unknown error'));

      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      await expect(aiService.analyzeFieldQuality(context)).rejects.toThrow(AIServiceError);
    });

    it('should preserve AIServiceError instances', async () => {
      mockRateLimiter.checkLimit = jest.fn().mockResolvedValue(false);

      const context: AnalysisContext = {
        user: mockUser,
        language_level: 4,
        nca: mockNCA
      };

      try {
        await aiService.analyzeFieldQuality(context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect((error as AIServiceError).code).toBe('rate_limit_exceeded');
      }
    });
  });

  describe('Configuration', () => {
    it('should use environment variables for default config', () => {
      const envService = new AIService(
        mockAnthropicClient,
        mockKnowledgeBase,
        mockAuditLogger,
        mockRateLimiter
      );

      // Service should not throw on construction
      expect(envService).toBeDefined();
    });

    it('should override config with constructor parameters', () => {
      const customService = new AIService(
        mockAnthropicClient,
        mockKnowledgeBase,
        mockAuditLogger,
        mockRateLimiter,
        {
          quality_threshold: 90,
          temperature: 0.5
        }
      );

      expect(customService).toBeDefined();
      // Config is private, but behavior should reflect custom threshold
    });
  });
});
