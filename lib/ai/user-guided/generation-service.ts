/**
 * User-Guided Content Generation Service (2027)
 * Interactive AI assistance with conversational refinement
 * 
 * Features:
 * - Drafting on request
 * - Interactive refinement loop
 * - Natural language interface (No-UI option)
 * - Tone and detail level controls
 */

import type { NCA, MJC } from '../types';
import { EnhancedRAGService } from '../rag/enhanced-rag-service';

export interface GenerationRequest {
  field: string;
  currentValue?: string;
  formData: Partial<NCA | MJC>;
  formType: 'nca' | 'mjc';
  userPrompt?: string; // Optional user guidance
  tone?: 'technical' | 'layman' | 'standard';
  detailLevel?: 'brief' | 'standard' | 'detailed';
}

export interface GenerationResponse {
  draft: string;
  confidence: number;
  sources: string[];
  refinementOptions?: string[]; // Suggested refinement prompts
}

export interface RefinementRequest {
  originalDraft: string;
  refinementPrompt: string;
  context: GenerationRequest;
}

export class UserGuidedGenerationService {
  private ragService: EnhancedRAGService;

  constructor() {
    this.ragService = new EnhancedRAGService();
  }

  /**
   * Generate initial draft based on user request
   */
  async generateDraft(request: GenerationRequest): Promise<GenerationResponse> {
    // Retrieve RAG context
    const context = await this.ragService.retrieveContext(
      request.currentValue || request.userPrompt || '',
      request.formType,
      request.formData
    );

    // Build generation prompt with user guidance
    const prompt = this.buildGenerationPrompt(request, context);

    // Generate draft (in production, call LLM with RAG context)
    const draft = await this.callGenerationModel(prompt, request);

    // Generate refinement options
    const refinementOptions = this.generateRefinementOptions(draft, request);

    return {
      draft,
      confidence: 0.8,
      sources: [
        ...context.procedures.map(p => p.procedure_number),
        ...context.similarCases.map(c => c.id),
      ],
      refinementOptions,
    };
  }

  /**
   * Refine existing draft based on user feedback
   */
  async refineDraft(refinement: RefinementRequest): Promise<GenerationResponse> {
    const context = await this.ragService.retrieveContext(
      refinement.originalDraft,
      refinement.context.formType,
      refinement.context.formData
    );

    // Build refinement prompt
    const prompt = this.buildRefinementPrompt(refinement, context);

    // Generate refined draft
    const draft = await this.callGenerationModel(prompt, refinement.context);

    return {
      draft,
      confidence: 0.85, // Higher confidence after refinement
      sources: [
        ...context.procedures.map(p => p.procedure_number),
        ...context.similarCases.map(c => c.id),
      ],
    };
  }

  /**
   * Build generation prompt with user guidance
   */
  private buildGenerationPrompt(
    request: GenerationRequest,
    context: any
  ): string {
    const toneInstruction = this.getToneInstruction(request.tone);
    const detailInstruction = this.getDetailInstruction(request.detailLevel);

    return `Generate a ${request.field} for a ${request.formType} form.

User guidance: ${request.userPrompt || 'Generate a complete, compliant entry'}

Tone: ${toneInstruction}
Detail level: ${detailInstruction}

Current value: ${request.currentValue || '(empty)'}

Relevant procedures:
${context.procedures.map((p: any) => `- ${p.procedure_number}: ${p.content.substring(0, 200)}`).join('\n')}

Similar cases:
${context.similarCases.map((c: any) => `- ${c.description.substring(0, 150)}`).join('\n')}

Generate a draft that follows procedures and incorporates best practices:`;
  }

  /**
   * Build refinement prompt
   */
  private buildRefinementPrompt(
    refinement: RefinementRequest,
    context: any
  ): string {
    return `Refine the following draft based on user feedback.

Original draft:
${refinement.originalDraft}

User refinement request: ${refinement.refinementPrompt}

Relevant context:
${context.procedures.map((p: any) => `- ${p.procedure_number}`).join('\n')}

Refined draft:`;
  }

  /**
   * Generate refinement options for user
   */
  private generateRefinementOptions(
    draft: string,
    request: GenerationRequest
  ): string[] {
    return [
      'Make it more detailed',
      'Simplify the language',
      'Add more specific actions',
      'Include procedure references',
      'Make it more concise',
    ];
  }

  /**
   * Get tone instruction
   */
  private getToneInstruction(tone?: string): string {
    switch (tone) {
      case 'technical':
        return 'Use technical terminology and industry-specific language';
      case 'layman':
        return 'Use simple, non-technical language that anyone can understand';
      default:
        return 'Use standard professional language';
    }
  }

  /**
   * Get detail level instruction
   */
  private getDetailInstruction(detailLevel?: string): string {
    switch (detailLevel) {
      case 'brief':
        return 'Be concise, include only essential information';
      case 'detailed':
        return 'Be comprehensive, include all relevant details and context';
      default:
        return 'Include standard level of detail';
    }
  }

  /**
   * Call generation model (placeholder - in production, integrate with LLM)
   */
  private async callGenerationModel(
    prompt: string,
    request: GenerationRequest
  ): Promise<string> {
    // In production, this would:
    // 1. Call LLM API (Anthropic, OpenAI, etc.)
    // 2. Use RAG context in prompt
    // 3. Apply tone and detail level settings
    // 4. Return generated text

    return `[Generated draft based on user guidance and RAG context. In production, this would be the actual model output.]`;
  }
}

