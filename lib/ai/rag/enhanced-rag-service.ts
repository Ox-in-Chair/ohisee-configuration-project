/**
 * Enhanced RAG Service (2026-2027)
 * Retrieval-Augmented Generation with fine-tuning support
 * 
 * Features:
 * - Dynamic knowledge retrieval from BRCGS procedures
 * - Historical case similarity search
 * - Fine-tuned model integration hooks
 * - Real-time policy updates
 * - Packaging safety integration
 * - GMP standards integration
 * - Industry benchmarks integration
 */

import { createServerClient } from '@/lib/database/client';
import type { NCA, MJC } from '../types';
import { createPackagingSafetyService } from '@/lib/knowledge/packaging-safety-service';
import { createGMPStandardsService } from '@/lib/knowledge/gmp-standards-service';
import { createIndustryBenchmarksService } from '@/lib/knowledge/industry-benchmarks-service';

export interface RAGContext {
  procedures: Array<{
    procedure_number: string;
    content: string;
    relevance: number;
    brcgs_section?: string;
  }>;
  similarCases: Array<{
    id: string;
    description: string;
    corrective_action: string;
    similarity: number;
    quality_score?: number;
  }>;
  policyVersion: string;
  retrievedAt: Date;
}

export interface FineTuningConfig {
  enabled: boolean;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export class EnhancedRAGService {
  private readonly supabase = createServerClient();

  /**
   * Retrieve relevant context for validation or suggestion generation
   */
  async retrieveContext(
    query: string,
    formType: 'nca' | 'mjc',
    formData?: Partial<NCA | MJC>
  ): Promise<RAGContext> {
    // 1. Search procedures using semantic similarity
    const procedures = await this.searchProcedures(query);

    // 2. Find similar historical cases
    const similarCases = await this.findSimilarCases(query, formType, formData);

    // 3. Get current policy version
    const policyVersion = await this.getPolicyVersion();

    return {
      procedures,
      similarCases,
      policyVersion,
      retrievedAt: new Date(),
    };
  }

  /**
   * Search BRCGS procedures using vector similarity
   */
  private async searchProcedures(query: string): Promise<RAGContext['procedures']> {
    try {
      // Generate embedding for query (in production, use OpenAI/Anthropic embedding API)
      // For now, use full-text search as fallback
      const { data, error } = await (this.supabase
        .from('knowledge_base_documents') as any)
        .select('document_number, full_text, brcgs_section')
        .eq('status', 'current')
        .textSearch('full_text', query, {
          type: 'websearch',
          config: 'english',
        })
        .limit(5);

      if (error) {
        console.error('Procedure search error:', error);
        return [];
      }

      return (data || []).map((doc: any, index: number) => ({
        procedure_number: doc.document_number,
        content: doc.full_text.substring(0, 500) + '...',
        relevance: 1 - (index * 0.1), // Mock relevance score
        brcgs_section: doc.brcgs_section,
      }));
    } catch (error) {
      console.error('RAG procedure search failed:', error);
      return [];
    }
  }

  /**
   * Find similar historical cases using vector similarity
   */
  private async findSimilarCases(
    query: string,
    formType: 'nca' | 'mjc',
    formData?: Partial<NCA | MJC>
  ): Promise<RAGContext['similarCases']> {
    try {
      const tableName = formType === 'nca' ? 'nca_records' : 'mjc_records';
      const descriptionField = formType === 'nca' ? 'nc_description' : 'description_required';

      // Search for similar cases (simplified - in production, use vector similarity)
      const { data, error } = await (this.supabase
        .from(tableName) as any)
        .select(`${descriptionField}, corrective_action, id`)
        .eq('status', 'closed')
        .limit(3);

      if (error) {
        console.error('Similar case search error:', error);
        return [];
      }

      // Calculate similarity (simplified - in production, use vector embeddings)
      return (data || []).map((case_: any, index: number) => ({
        id: case_.id,
        description: case_[descriptionField]?.substring(0, 200) || '',
        corrective_action: case_.corrective_action?.substring(0, 200) || '',
        similarity: 0.8 - (index * 0.1), // Mock similarity
        quality_score: 85, // Mock quality score
      }));
    } catch (error) {
      console.error('RAG similar case search failed:', error);
      return [];
    }
  }

  /**
   * Get current policy version for audit trail
   */
  private async getPolicyVersion(): Promise<string> {
    try {
      const { data } = await (this.supabase
        .from('policy_versions') as any)
        .select('version')
        .eq('status', 'active')
        .single();

      return data?.version || '1.0.0';
    } catch (error) {
      console.error('Policy version retrieval failed:', error);
      return '1.0.0';
    }
  }

  /**
   * Generate suggestion using RAG context
   */
  async generateSuggestionWithRAG(
    field: string,
    currentValue: string,
    formData: Partial<NCA | MJC>,
    formType: 'nca' | 'mjc',
    config?: FineTuningConfig
  ): Promise<{
    suggestion: string;
    sources: string[];
    confidence: number;
  }> {
    // Retrieve relevant context
    const context = await this.retrieveContext(currentValue, formType, formData);

    // Retrieve additional knowledge sources
    const packagingContext = await this.retrievePackagingContext(formData, field);
    const gmpContext = await this.retrieveGMPContext(formData, formType);
    const benchmarkContext = await this.retrieveBenchmarkContext(formData, formType);

    // Build prompt with all context
    const prompt = this.buildRAGPrompt(
      field,
      currentValue,
      formData,
      context,
      packagingContext,
      gmpContext,
      benchmarkContext
    );

    // Generate suggestion (in production, call fine-tuned model or LLM with RAG context)
    // For now, return a placeholder that would be generated by the model
    const suggestion = await this.callFineTunedModel(prompt, config);

    return {
      suggestion,
      sources: [
        ...context.procedures.map(p => p.procedure_number),
        ...context.similarCases.map(c => c.id),
        ...(packagingContext?.sources || []),
        ...(gmpContext?.sources || []),
      ],
      confidence: 0.85,
    };
  }

  /**
   * Retrieve packaging material context if applicable
   */
  private async retrievePackagingContext(
    formData: Partial<NCA | MJC>,
    fieldName: string
  ): Promise<{ material?: any; suggestions?: string[]; sources: string[] } | null> {
    if (fieldName !== 'nc_product_description' && fieldName !== 'nc_description') {
      return null;
    }

    try {
      const packagingService = createPackagingSafetyService();
      const productDesc = (formData as any).nc_product_description || '';
      
      if (!productDesc || productDesc.length < 3) {
        return null;
      }

      // Try to find matching packaging material
      const materials = await packagingService.searchMaterials(productDesc);
      if (materials.length === 0) {
        return null;
      }

      const material = materials[0];
      const safetyInfo = await packagingService.getSafetySuggestions(material.material_code, productDesc);

      return {
        material,
        suggestions: safetyInfo?.correctiveActions || [],
        sources: [packagingService.getBRCGSSection()],
      };
    } catch (error) {
      console.error('Error retrieving packaging context:', error);
      return null;
    }
  }

  /**
   * Retrieve GMP standards context
   */
  private async retrieveGMPContext(
    formData: Partial<NCA | MJC>,
    formType: 'nca' | 'mjc'
  ): Promise<{ violations?: any[]; recommendations?: string[]; sources: string[] } | null> {
    try {
      const gmpService = createGMPStandardsService();
      const complianceCheck = await gmpService.checkCompliance(formData, formType);

      if (complianceCheck.violations.length === 0 && complianceCheck.recommendations.length === 0) {
        return null;
      }

      return {
        violations: complianceCheck.violations,
        recommendations: complianceCheck.recommendations,
        sources: complianceCheck.violations.map(v => v.standard.document_number),
      };
    } catch (error) {
      console.error('Error retrieving GMP context:', error);
      return null;
    }
  }

  /**
   * Retrieve industry benchmark context
   */
  private async retrieveBenchmarkContext(
    formData: Partial<NCA | MJC>,
    formType: 'nca' | 'mjc'
  ): Promise<{ comparisons?: any[]; sources: string[] } | null> {
    // This would be populated when we have actual benchmark data
    // For now, return null as benchmarks are typically calculated after submission
    return null;
  }

  /**
   * Build prompt with RAG context
   */
  private buildRAGPrompt(
    field: string,
    currentValue: string,
    formData: Partial<NCA | MJC>,
    context: RAGContext,
    packagingContext?: { material?: any; suggestions?: string[]; sources: string[] } | null,
    gmpContext?: { violations?: any[]; recommendations?: string[]; sources: string[] } | null,
    benchmarkContext?: { comparisons?: any[]; sources: string[] } | null
  ): string {
    const procedureContext = context.procedures
      .map(p => `Procedure ${p.procedure_number} (BRCGS ${p.brcgs_section}): ${p.content}`)
      .join('\n\n');

    const similarCaseContext = context.similarCases
      .map(c => `Similar case: ${c.description}\nCorrective action: ${c.corrective_action}`)
      .join('\n\n');

    // Get field-specific instructions
    const fieldInstructions = this.getFieldSpecificInstructions(field, formData);

    // Build packaging context section
    let packagingSection = '';
    if (packagingContext?.material) {
      packagingSection = `
## PACKAGING MATERIAL CONTEXT
Material: ${packagingContext.material.material_code} - ${packagingContext.material.material_name}
BRCGS Section: ${packagingContext.material.brcgs_section || '5.8'}
${packagingContext.suggestions && packagingContext.suggestions.length > 0
  ? `Packaging-specific corrective actions:\n${packagingContext.suggestions.join('\n')}`
  : ''}
`;
    }

    // Build GMP context section
    let gmpSection = '';
    if (gmpContext?.violations && gmpContext.violations.length > 0) {
      gmpSection = `
## GMP COMPLIANCE CONTEXT
GMP Violations Detected:
${gmpContext.violations.map(v => `- ${v.violation_type.toUpperCase()}: ${v.description}\n  Suggested action: ${v.suggestedAction}`).join('\n')}

GMP Recommendations:
${gmpContext.recommendations?.join('\n') || 'None'}
`;
    }

    return `You are helping improve a ${field} field in a quality control form.

## CRITICAL: FIELD-SPECIFIC REQUIREMENTS
${fieldInstructions}

## CURRENT TEXT (User's Original Entry)
${currentValue || '(empty - generate new content)'}

## RELEVANT PROCEDURES
${procedureContext}

## SIMILAR HISTORICAL CASES
${similarCaseContext}
${packagingSection}${gmpSection}
## YOUR TASK
Rewrite and improve the current text above. You MUST:
1. **Preserve the original meaning and facts** - Do not add information that wasn't in the original
2. **Correct UK English spelling** - Use British English (e.g., "colour" not "color", "organise" not "organize", "centre" not "center")
3. **Fix grammar and sentence structure** - Make it professional but accessible for blue-collar workers
4. **Improve clarity** - Break up long sentences, use clear language, fix broken English
5. **Maintain field-appropriate content** - ${this.getFieldContentGuidance(field)}
6. **Keep it concise** - Don't add unnecessary words, just improve what's there
${packagingContext?.material ? '7. **Consider packaging material context** - Reference BRCGS Section 5.8 if applicable' : ''}
${gmpContext?.violations && gmpContext.violations.length > 0 ? '8. **Address GMP violations** - Ensure GMP compliance in the rewritten text' : ''}

## OUTPUT
Return ONLY the rewritten, improved text. Do not include explanations, notes, or section headers unless they were in the original.

Rewritten text:`;
  }

  /**
   * Get field-specific instructions based on field name
   */
  private getFieldSpecificInstructions(field: string, formData: Partial<NCA | MJC>): string {
    switch (field) {
      case 'nc_description':
        return `**NC DESCRIPTION FIELD** - This field describes WHAT HAPPENED, not what to do about it.
- Rewrite the description of the non-conformance event
- Include: what happened, when (time/date), where (location), quantity affected, batch/carton numbers
- DO NOT include root cause analysis, corrective actions, or verification steps
- Keep it as a factual description of the incident/defect
- Use clear, professional language suitable for blue-collar workers`;

      case 'root_cause_analysis':
        return `**ROOT CAUSE ANALYSIS FIELD** - This field explains WHY it happened.
- Rewrite the root cause analysis using the 5-Why method
- Structure as: Why did this happen? → [cause]. Why? → [deeper cause]. Why? → [root cause]
- DO NOT include corrective actions or verification steps
- Focus on identifying the underlying systemic cause
- Use clear, professional language`;

      case 'corrective_action':
        return `**CORRECTIVE ACTION FIELD** - This field describes WHAT WILL BE DONE to prevent recurrence.
- Rewrite the corrective action plan
- Include: immediate fixes, long-term preventive measures, procedure references, verification methods
- DO NOT include root cause analysis or description of what happened
- Focus on specific, actionable steps
- Reference BRCGS procedures where applicable`;

      case 'description_required':
        return `**MJC DESCRIPTION FIELD** - This field describes the maintenance issue.
- Rewrite the description of what needs to be fixed
- Include: equipment, symptoms, urgency, safety considerations
- DO NOT include maintenance procedures, hygiene clearance, or verification steps
- Keep it as a clear description of the problem`;

      default:
        return `**GENERAL FIELD** - Improve the text for clarity, grammar, and UK English spelling.
- Preserve all original information
- Fix spelling, grammar, and sentence structure
- Make it professional and clear`;
    }
  }

  /**
   * Get guidance on what content belongs in each field
   */
  private getFieldContentGuidance(field: string): string {
    switch (field) {
      case 'nc_description':
        return 'ONLY describe what happened - no root cause, no corrective actions';
      case 'root_cause_analysis':
        return 'ONLY explain why it happened - no descriptions, no corrective actions';
      case 'corrective_action':
        return 'ONLY describe what will be done - no descriptions, no root cause';
      default:
        return 'Improve the text while keeping the same type of content';
    }
  }

  /**
   * Call fine-tuned model (placeholder - in production, integrate with actual model)
   */
  private async callFineTunedModel(
    prompt: string,
    config?: FineTuningConfig
  ): Promise<string> {
    // In production, this would:
    // 1. Call fine-tuned model API (e.g., OpenAI fine-tuned model, Anthropic custom model)
    // 2. Use config to adjust temperature, max tokens, etc.
    // 3. Return generated suggestion

    // For now, return a placeholder
    return `[Generated suggestion based on RAG context and fine-tuned model. In production, this would be the actual model output.]`;
  }
}

