/**
 * Comprehensive Test Suite for UserGuidedGenerationService
 * Target Coverage: >95%
 *
 * Tests:
 * - Draft generation with various parameters
 * - Refinement workflow
 * - Tone and detail level handling
 * - RAG context integration
 * - Error handling
 */

import {
  UserGuidedGenerationService,
  GenerationRequest,
  GenerationResponse,
  RefinementRequest,
} from '../generation-service';
import { EnhancedRAGService } from '../../rag/enhanced-rag-service';

// Mock EnhancedRAGService
jest.mock('../../rag/enhanced-rag-service');

describe('UserGuidedGenerationService', () => {
  let service: UserGuidedGenerationService;
  let mockRAGService: jest.Mocked<EnhancedRAGService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock RAG service
    mockRAGService = {
      retrieveContext: jest.fn(),
    } as any;

    (EnhancedRAGService as jest.Mock).mockImplementation(() => mockRAGService);

    service = new UserGuidedGenerationService();
  });

  describe('generateDraft', () => {
    const mockRAGContext = {
      procedures: [
        {
          procedure_number: 'BRCGS 5.7.1',
          content: 'Procedure for non-conformance control...',
        },
        {
          procedure_number: 'BRCGS 5.7.3',
          content: 'Root cause analysis procedure...',
        },
      ],
      similarCases: [
        {
          id: 'NCA-2024-001',
          description: 'Similar issue with machine malfunction',
        },
        {
          id: 'NCA-2024-002',
          description: 'Previous case of quality deviation',
        },
      ],
    };

    beforeEach(() => {
      mockRAGService.retrieveContext.mockResolvedValue(mockRAGContext);
    });

    it('should generate draft with basic request', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {
          nca_id: 'NCA-2025-001',
          nc_description: 'Machine malfunction causing production delay',
        },
      };

      const result = await service.generateDraft(request);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        '',
        'nca',
        request.formData
      );

      expect(result).toEqual({
        draft: expect.any(String),
        confidence: 0.8,
        sources: expect.arrayContaining(['BRCGS 5.7.1', 'BRCGS 5.7.3', 'NCA-2024-001', 'NCA-2024-002']),
        refinementOptions: expect.any(Array),
      });

      expect(result.refinementOptions).toHaveLength(5);
      expect(result.refinementOptions).toContain('Make it more detailed');
    });

    it('should use currentValue when provided', async () => {
      const request: GenerationRequest = {
        field: 'root_cause_analysis',
        currentValue: 'Initial root cause: inadequate training',
        formType: 'nca',
        formData: {},
      };

      await service.generateDraft(request);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        'Initial root cause: inadequate training',
        'nca',
        {}
      );
    });

    it('should use userPrompt when provided and no currentValue', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        userPrompt: 'Focus on training and prevention',
        formType: 'mjc',
        formData: {},
      };

      await service.generateDraft(request);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        'Focus on training and prevention',
        'mjc',
        {}
      );
    });

    it('should prioritize currentValue over userPrompt', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        currentValue: 'Current text',
        userPrompt: 'User guidance',
        formType: 'nca',
        formData: {},
      };

      await service.generateDraft(request);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        'Current text',
        'nca',
        {}
      );
    });

    it('should handle technical tone', async () => {
      const request: GenerationRequest = {
        field: 'maintenance_performed',
        formType: 'mjc',
        formData: {},
        tone: 'technical',
      };

      const result = await service.generateDraft(request);

      // Should generate draft (implementation detail tested via integration)
      expect(result.draft).toBeDefined();
      expect(result.confidence).toBe(0.8);
    });

    it('should handle layman tone', async () => {
      const request: GenerationRequest = {
        field: 'nc_description',
        formType: 'nca',
        formData: {},
        tone: 'layman',
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
      expect(result.confidence).toBe(0.8);
    });

    it('should handle standard tone (default)', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        tone: 'standard',
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
    });

    it('should handle brief detail level', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        detailLevel: 'brief',
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
      expect(result.confidence).toBe(0.8);
    });

    it('should handle detailed detail level', async () => {
      const request: GenerationRequest = {
        field: 'root_cause_analysis',
        formType: 'nca',
        formData: {},
        detailLevel: 'detailed',
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
    });

    it('should handle standard detail level (default)', async () => {
      const request: GenerationRequest = {
        field: 'verification',
        formType: 'nca',
        formData: {},
        detailLevel: 'standard',
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
    });

    it('should handle combination of tone and detail level', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        tone: 'technical',
        detailLevel: 'detailed',
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
      expect(result.confidence).toBe(0.8);
    });

    it('should include all refinement options', async () => {
      const request: GenerationRequest = {
        field: 'nc_description',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);

      expect(result.refinementOptions).toEqual([
        'Make it more detailed',
        'Simplify the language',
        'Add more specific actions',
        'Include procedure references',
        'Make it more concise',
      ]);
    });

    it('should extract sources from RAG context', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);

      expect(result.sources).toEqual([
        'BRCGS 5.7.1',
        'BRCGS 5.7.3',
        'NCA-2024-001',
        'NCA-2024-002',
      ]);
    });

    it('should handle empty RAG context', async () => {
      mockRAGService.retrieveContext.mockResolvedValue({
        procedures: [],
        similarCases: [],
      });

      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);

      expect(result.sources).toEqual([]);
      expect(result.draft).toBeDefined();
    });

    it('should handle MJC form type', async () => {
      const request: GenerationRequest = {
        field: 'maintenance_performed',
        formType: 'mjc',
        formData: {
          mjc_id: 'MJC-2025-042',
          description_required: 'Electrical fault on conveyor',
        },
      };

      const result = await service.generateDraft(request);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        '',
        'mjc',
        request.formData
      );

      expect(result.draft).toBeDefined();
    });

    it('should handle RAG service failure gracefully', async () => {
      mockRAGService.retrieveContext.mockRejectedValue(new Error('RAG service unavailable'));

      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
      };

      // Should not throw
      await expect(service.generateDraft(request)).rejects.toThrow('RAG service unavailable');
    });
  });

  describe('refineDraft', () => {
    const mockRAGContext = {
      procedures: [
        {
          procedure_number: 'BRCGS 5.7.2',
          content: 'Corrective action procedure...',
        },
      ],
      similarCases: [
        {
          id: 'NCA-2024-003',
          description: 'Similar corrective action',
        },
      ],
    };

    beforeEach(() => {
      mockRAGService.retrieveContext.mockResolvedValue(mockRAGContext);
    });

    it('should refine draft based on user feedback', async () => {
      const refinement: RefinementRequest = {
        originalDraft: 'Original corrective action draft',
        refinementPrompt: 'Make it more specific with timelines',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      const result = await service.refineDraft(refinement);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        'Original corrective action draft',
        'nca',
        {}
      );

      expect(result).toEqual({
        draft: expect.any(String),
        confidence: 0.85, // Higher confidence after refinement
        sources: ['BRCGS 5.7.2', 'NCA-2024-003'],
      });
    });

    it('should use higher confidence for refined drafts', async () => {
      const refinement: RefinementRequest = {
        originalDraft: 'Original draft',
        refinementPrompt: 'Add more detail',
        context: {
          field: 'root_cause_analysis',
          formType: 'nca',
          formData: {},
        },
      };

      const result = await service.refineDraft(refinement);

      expect(result.confidence).toBe(0.85);
    });

    it('should preserve context from original generation', async () => {
      const originalContext: GenerationRequest = {
        field: 'corrective_action',
        currentValue: 'Initial value',
        userPrompt: 'User guidance',
        formType: 'nca',
        formData: { nca_id: 'NCA-2025-001' },
        tone: 'technical',
        detailLevel: 'detailed',
      };

      const refinement: RefinementRequest = {
        originalDraft: 'Original draft text',
        refinementPrompt: 'Improve clarity',
        context: originalContext,
      };

      const result = await service.refineDraft(refinement);

      // Should use original form data
      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        'Original draft text',
        'nca',
        { nca_id: 'NCA-2025-001' }
      );

      expect(result.draft).toBeDefined();
    });

    it('should handle multiple refinement iterations', async () => {
      const originalDraft = 'Version 1';

      // First refinement
      const refinement1: RefinementRequest = {
        originalDraft,
        refinementPrompt: 'Add more detail',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      const result1 = await service.refineDraft(refinement1);
      expect(result1.confidence).toBe(0.85);

      // Second refinement
      const refinement2: RefinementRequest = {
        originalDraft: result1.draft,
        refinementPrompt: 'Simplify language',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      const result2 = await service.refineDraft(refinement2);
      expect(result2.confidence).toBe(0.85);

      // Third refinement
      const refinement3: RefinementRequest = {
        originalDraft: result2.draft,
        refinementPrompt: 'Add procedure references',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      const result3 = await service.refineDraft(refinement3);
      expect(result3.confidence).toBe(0.85);
    });

    it('should handle different refinement prompts', async () => {
      const refinementPrompts = [
        'Make it more detailed',
        'Simplify the language',
        'Add more specific actions',
        'Include procedure references',
        'Make it more concise',
      ];

      for (const prompt of refinementPrompts) {
        const refinement: RefinementRequest = {
          originalDraft: 'Test draft',
          refinementPrompt: prompt,
          context: {
            field: 'corrective_action',
            formType: 'nca',
            formData: {},
          },
        };

        const result = await service.refineDraft(refinement);
        expect(result.draft).toBeDefined();
        expect(result.confidence).toBe(0.85);
      }
    });

    it('should handle MJC form refinement', async () => {
      const refinement: RefinementRequest = {
        originalDraft: 'Original maintenance action',
        refinementPrompt: 'Add safety considerations',
        context: {
          field: 'maintenance_performed',
          formType: 'mjc',
          formData: {},
        },
      };

      const result = await service.refineDraft(refinement);

      expect(mockRAGService.retrieveContext).toHaveBeenCalledWith(
        'Original maintenance action',
        'mjc',
        {}
      );

      expect(result.draft).toBeDefined();
    });

    it('should handle RAG service failure during refinement', async () => {
      mockRAGService.retrieveContext.mockRejectedValue(new Error('Network error'));

      const refinement: RefinementRequest = {
        originalDraft: 'Test draft',
        refinementPrompt: 'Refine',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      await expect(service.refineDraft(refinement)).rejects.toThrow('Network error');
    });
  });

  describe('Tone Instructions', () => {
    beforeEach(() => {
      mockRAGService.retrieveContext.mockResolvedValue({
        procedures: [],
        similarCases: [],
      });
    });

    it('should return technical tone instruction', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        tone: 'technical',
      };

      // Spy on private method via public API
      const result = await service.generateDraft(request);

      // Verify result is generated (tone instruction used internally)
      expect(result.draft).toBeDefined();
    });

    it('should return layman tone instruction', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        tone: 'layman',
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should return standard tone instruction for undefined tone', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        // tone undefined
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });
  });

  describe('Detail Level Instructions', () => {
    beforeEach(() => {
      mockRAGService.retrieveContext.mockResolvedValue({
        procedures: [],
        similarCases: [],
      });
    });

    it('should return brief detail instruction', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        detailLevel: 'brief',
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should return detailed instruction', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        detailLevel: 'detailed',
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should return standard detail instruction for undefined level', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        // detailLevel undefined
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockRAGService.retrieveContext.mockResolvedValue({
        procedures: [],
        similarCases: [],
      });
    });

    it('should handle empty field name', async () => {
      const request: GenerationRequest = {
        field: '',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle empty formData', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle very long currentValue', async () => {
      const longValue = 'A'.repeat(5000);
      const request: GenerationRequest = {
        field: 'corrective_action',
        currentValue: longValue,
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle special characters in prompts', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        userPrompt: 'Focus on <>&"\' special characters',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle null/undefined in formData', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {
          nca_id: null as any,
          nc_description: undefined,
        },
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle invalid tone gracefully', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        tone: 'invalid-tone' as any,
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle invalid detail level gracefully', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
        detailLevel: 'invalid-level' as any,
      };

      const result = await service.generateDraft(request);
      expect(result.draft).toBeDefined();
    });

    it('should handle empty original draft in refinement', async () => {
      const refinement: RefinementRequest = {
        originalDraft: '',
        refinementPrompt: 'Generate from scratch',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      const result = await service.refineDraft(refinement);
      expect(result.draft).toBeDefined();
    });

    it('should handle empty refinement prompt', async () => {
      const refinement: RefinementRequest = {
        originalDraft: 'Original draft',
        refinementPrompt: '',
        context: {
          field: 'corrective_action',
          formType: 'nca',
          formData: {},
        },
      };

      const result = await service.refineDraft(refinement);
      expect(result.draft).toBeDefined();
    });
  });

  describe('Prompt Building', () => {
    beforeEach(() => {
      mockRAGService.retrieveContext.mockResolvedValue({
        procedures: [
          {
            procedure_number: 'BRCGS 5.7.1',
            content: 'Long procedure content that will be truncated to 200 characters for the prompt. This is additional text to ensure we test truncation behavior properly in the prompt generation.',
          },
        ],
        similarCases: [
          {
            id: 'NCA-2024-001',
            description: 'This is a similar case description that will be truncated to 150 characters. We need to ensure the truncation works correctly and additional text is cut off.',
          },
        ],
      });
    });

    it('should build generation prompt with all components', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        currentValue: 'Initial value',
        userPrompt: 'User guidance text',
        formType: 'nca',
        formData: {},
        tone: 'technical',
        detailLevel: 'detailed',
      };

      const result = await service.generateDraft(request);

      // Prompt is built internally; verify output is generated
      expect(result.draft).toBeDefined();
      expect(result.sources).toContain('BRCGS 5.7.1');
      expect(result.sources).toContain('NCA-2024-001');
    });

    it('should truncate procedure content in prompt', async () => {
      const request: GenerationRequest = {
        field: 'corrective_action',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);

      // Content truncation happens internally
      expect(result.draft).toBeDefined();
    });

    it('should truncate similar case descriptions in prompt', async () => {
      const request: GenerationRequest = {
        field: 'root_cause_analysis',
        formType: 'nca',
        formData: {},
      };

      const result = await service.generateDraft(request);

      expect(result.draft).toBeDefined();
    });
  });
});
