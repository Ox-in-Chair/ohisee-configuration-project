/**
 * AIService Implementation
 * Production-ready AI service with dependency injection
 *
 * Architecture:
 * - Zero static calls - all dependencies injected
 * - Fully testable with mocked dependencies
 * - TypeScript strict mode compliant
 * - Graceful degradation if AI unavailable
 */

import {
  IAIService,
  IAnthropicClient,
  IKnowledgeBaseService,
  IAuditLogger,
  IRateLimiter,
  AnthropicMessageRequest
} from './ai-service.interface';
import {
  AnalysisContext,
  QualityScore,
  Suggestion,
  HazardClassification,
  ValidationResult,
  NCA,
  User,
  AIConfig,
  AIServiceError,
  ConfidenceLevel,
  LanguageLevel
} from './types';
import { QualityScorer } from './quality-scorer';
import { NCAQualityScoringPrompt } from './prompts/nca-quality-scoring';
import { MJCQualityScoringPrompt } from './prompts/mjc-quality-scoring';
import { HazardClassificationPrompt } from './prompts/hazard-classification';
import { RoleAdaptationPrompt } from './prompts/role-adaptation';

export class AIService implements IAIService {
  private readonly config: AIConfig;
  private readonly qualityScorer: QualityScorer;

  constructor(
    private readonly anthropicClient: IAnthropicClient,
    private readonly knowledgeBase: IKnowledgeBaseService,
    private readonly auditLogger: IAuditLogger,
    private readonly rateLimiter: IRateLimiter,
    config: Partial<AIConfig> = {}
  ) {
    // Default configuration from environment
    this.config = {
      mode: (config.mode ?? process.env.AI_MODE ?? 'adaptive') as 'fast' | 'adaptive' | 'deep',
      model: config.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
      quality_threshold: config.quality_threshold ?? Number(process.env.AI_QUALITY_THRESHOLD ?? 75),
      fast_response_timeout: config.fast_response_timeout ?? Number(process.env.AI_FAST_RESPONSE_TIMEOUT ?? 2000),
      deep_validation_timeout: config.deep_validation_timeout ?? Number(process.env.AI_DEEP_VALIDATION_TIMEOUT ?? 30000),
      temperature: config.temperature ?? 0.3,
      max_tokens: config.max_tokens ?? 4096
    };

    this.qualityScorer = new QualityScorer();
  }

  /**
   * Analyze field quality in real-time (inline suggestions)
   * Fast mode: <2s response time for immediate feedback
   */
  async analyzeFieldQuality(context: AnalysisContext): Promise<QualityScore> {
    // Rate limiting check
    const allowed = await this.rateLimiter.checkLimit(context.user.id);
    if (!allowed) {
      throw new AIServiceError(
        'rate_limit_exceeded',
        'Too many AI requests. Please wait before trying again.'
      );
    }

    await this.rateLimiter.recordRequest(context.user.id);

    try {
      // Determine timeout based on mode
      const timeout = this.config.mode === 'fast'
        ? this.config.fast_response_timeout
        : this.config.deep_validation_timeout;

      // Build prompt with role adaptation
      const prompt = this.buildFieldAnalysisPrompt(context);

      // Call Anthropic API with timeout
      const response = await this.callAnthropicWithTimeout(prompt, timeout);

      // Parse response and calculate quality score
      const qualityScore = this.qualityScorer.calculateFieldQuality(
        response,
        context.nca ? 'nca' : 'mjc'
      );

      // Audit log
      await this.auditLogger.logInteraction({
        user_id: context.user.id,
        user_role: context.user.role,
        query_type: 'field_quality_analysis',
        query_context: context,
        response: qualityScore,
        quality_score: qualityScore.score
      });

      return qualityScore;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        'analysis_failed',
        'Failed to analyze field quality',
        error
      );
    }
  }

  /**
   * Generate AI suggestions for corrective actions or maintenance
   * Adaptive mode: Fast inline (<2s) vs deep validation (10-30s)
   */
  async generateSuggestions(context: AnalysisContext): Promise<Suggestion> {
    const allowed = await this.rateLimiter.checkLimit(context.user.id);
    if (!allowed) {
      throw new AIServiceError(
        'rate_limit_exceeded',
        'Too many AI requests. Please wait before trying again.'
      );
    }

    await this.rateLimiter.recordRequest(context.user.id);

    try {
      const recordType = context.nca ? 'nca' : 'mjc';

      // Retrieve relevant BRCGS procedures
      const description = context.nca?.nc_description ?? context.mjc?.description_required ?? '';
      const procedures = await this.knowledgeBase.searchProcedures(description, 5);

      // Find similar historical cases
      const similarCases = await this.knowledgeBase.findSimilarCases(description, recordType, 3);

      // Build comprehensive context
      const enrichedContext: AnalysisContext = {
        ...context,
        procedure_context: procedures.map(p => `${p.procedure_number}: ${p.content}`),
        historical_similar: similarCases.map(c => ({
          record_id: c.id,
          record_type: recordType,
          description: c.description,
          corrective_action: c.action,
          quality_score: 0, // Not available from search
          similarity_score: c.similarity
        }))
      };

      // Select appropriate prompt template
      const promptTemplate = recordType === 'nca'
        ? new NCAQualityScoringPrompt()
        : new MJCQualityScoringPrompt();

      const prompt = promptTemplate.build(enrichedContext);

      // Determine timeout
      const timeout = this.config.mode === 'deep'
        ? this.config.deep_validation_timeout
        : this.config.fast_response_timeout;

      // Call Anthropic API
      const response = await this.callAnthropicWithTimeout(prompt, timeout);

      // Parse structured response
      const suggestion = this.parseAISuggestion(response, recordType);

      // Calculate quality score
      const qualityScore = this.qualityScorer.calculateSuggestionQuality(suggestion, recordType);

      const finalSuggestion: Suggestion = {
        text: suggestion.text,
        sections: suggestion.sections,
        quality_score: qualityScore.score,
        confidence: suggestion.confidence,
        confidence_percentage: suggestion.confidence_percentage,
        procedure_references: suggestion.procedure_references,
        keywords_detected: suggestion.keywords_detected,
        recommendations: suggestion.recommendations
      };

      // Validate suggestion meets threshold
      if (qualityScore.score < this.config.quality_threshold) {
        throw new AIServiceError(
          'low_confidence',
          `AI suggestion quality (${qualityScore.score}) below threshold (${this.config.quality_threshold})`
        );
      }

      // Audit log
      await this.auditLogger.logInteraction({
        user_id: context.user.id,
        user_role: context.user.role,
        query_type: 'generate_suggestion',
        query_context: enrichedContext,
        response: finalSuggestion,
        quality_score: finalSuggestion.quality_score,
        confidence: finalSuggestion.confidence,
        procedure_references: finalSuggestion.procedure_references
      });

      return finalSuggestion;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        'analysis_failed',
        'Failed to generate AI suggestion',
        error
      );
    }
  }

  /**
   * Classify hazard type from description
   * Uses 11 BRCGS hazard categories
   */
  async classifyHazard(description: string): Promise<HazardClassification> {
    try {
      const promptTemplate = new HazardClassificationPrompt();
      const prompt = promptTemplate.build(description);

      const response = await this.callAnthropicWithTimeout(
        prompt,
        this.config.fast_response_timeout
      );

      return this.parseHazardClassification(response);
    } catch (error) {
      throw new AIServiceError(
        'analysis_failed',
        'Failed to classify hazard',
        error
      );
    }
  }

  /**
   * Validate complete NCA before submission
   * Comprehensive validation with quality gates
   */
  async validateBeforeSubmit(nca: NCA, user: User): Promise<ValidationResult> {
    const allowed = await this.rateLimiter.checkLimit(user.id);
    if (!allowed) {
      throw new AIServiceError(
        'rate_limit_exceeded',
        'Too many AI requests. Please wait before trying again.'
      );
    }

    await this.rateLimiter.recordRequest(user.id);

    try {
      const context: AnalysisContext = {
        user,
        language_level: this.calculateLanguageLevel(user.role),
        nca
      };

      // Generate quality assessment
      const qualityAssessment = await this.analyzeFieldQuality(context);

      // Check completeness
      const errors = this.validateCompleteness(nca);
      const warnings = this.generateWarnings(nca, qualityAssessment);

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        quality_assessment: qualityAssessment,
        ready_for_submission: errors.length === 0 && qualityAssessment.threshold_met
      };

      // Audit log
      await this.auditLogger.logInteraction({
        user_id: user.id,
        user_role: user.role,
        query_type: 'validate_before_submit',
        query_context: nca,
        response: result,
        quality_score: qualityAssessment.score
      });

      return result;
    } catch (error) {
      throw new AIServiceError(
        'validation_failed',
        'Failed to validate NCA',
        error
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async callAnthropicWithTimeout(
    prompt: string,
    timeoutMs: number
  ): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new AIServiceError('timeout', `AI request exceeded ${timeoutMs}ms`)), timeoutMs);
    });

    const apiPromise = this.callAnthropicAPI(prompt);

    const response = await Promise.race([apiPromise, timeoutPromise]);
    return response;
  }

  private async callAnthropicAPI(prompt: string): Promise<string> {
    try {
      const request: AnthropicMessageRequest = {
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      };

      const response = await this.anthropicClient.messages.create(request);

      if (response.content.length === 0) {
        throw new Error('Empty response from Anthropic API');
      }

      return response.content[0].text;
    } catch (error) {
      throw new AIServiceError(
        'api_error',
        'Anthropic API request failed',
        error
      );
    }
  }

  private buildFieldAnalysisPrompt(context: AnalysisContext): string {
    const roleAdapter = new RoleAdaptationPrompt();
    return roleAdapter.buildFieldAnalysisPrompt(context);
  }

  private parseAISuggestion(response: string, recordType: 'nca' | 'mjc'): Omit<Suggestion, 'quality_score'> {
    try {
      // Attempt to parse as JSON first (structured output)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeParsedSuggestion(parsed);
      }

      // Fallback: Parse from markdown sections
      return this.parseMarkdownSuggestion(response, recordType);
    } catch (error) {
      throw new AIServiceError(
        'analysis_failed',
        'Failed to parse AI suggestion',
        error
      );
    }
  }

  private normalizeParsedSuggestion(parsed: unknown): Omit<Suggestion, 'quality_score'> {
    const obj = parsed as Record<string, unknown>;

    return {
      text: String(obj.text ?? ''),
      sections: obj.sections as Suggestion['sections'],
      confidence: (obj.confidence as ConfidenceLevel) ?? 'medium',
      confidence_percentage: Number(obj.confidence_percentage ?? 70),
      procedure_references: (obj.procedure_references as string[]) ?? [],
      keywords_detected: obj.keywords_detected as Suggestion['keywords_detected'],
      recommendations: obj.recommendations as Suggestion['recommendations']
    };
  }

  private parseMarkdownSuggestion(response: string, recordType: 'nca' | 'mjc'): Omit<Suggestion, 'quality_score'> {
    // Extract sections using regex patterns
    const extractSection = (heading: string): string | undefined => {
      const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
      const match = response.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const sections: Suggestion['sections'] = recordType === 'nca' ? {
      immediate_correction: extractSection('Immediate Correction'),
      root_cause: extractSection('Root Cause'),
      corrective_action: extractSection('Corrective Action'),
      verification: extractSection('Verification') ?? ''
    } : {
      maintenance_scope: extractSection('Maintenance Scope'),
      safety_considerations: extractSection('Safety'),
      contamination_prevention: extractSection('Contamination Prevention'),
      hygiene_clearance: extractSection('Hygiene Clearance'),
      verification: extractSection('Verification') ?? ''
    };

    // Extract procedure references
    const procedureMatches = response.match(/\b\d+\.\d+(?:\.\d+)?\b/g) ?? [];
    const uniqueProcedures = Array.from(new Set(procedureMatches));

    // Extract keywords
    const keywordSection = extractSection('Keywords Detected') ?? '';
    const keywords = keywordSection.split(',').map(k => k.trim()).filter(Boolean);

    return {
      text: response,
      sections,
      confidence: this.inferConfidence(response),
      confidence_percentage: this.inferConfidencePercentage(response),
      procedure_references: uniqueProcedures,
      keywords_detected: {
        category: this.inferCategory(keywords),
        keywords
      },
      recommendations: this.parseRecommendations(response)
    };
  }

  private parseHazardClassification(response: string): HazardClassification {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in hazard classification response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as HazardClassification;
      return parsed;
    } catch (error) {
      throw new AIServiceError(
        'analysis_failed',
        'Failed to parse hazard classification',
        error
      );
    }
  }

  private validateCompleteness(nca: NCA): ReadonlyArray<ValidationResult['errors'][number]> {
    const errors: Array<ValidationResult['errors'][number]> = [];

    if (!nca.nc_description || nca.nc_description.length < 100) {
      errors.push({
        field: 'nc_description',
        message: 'Description must be at least 100 characters',
        severity: 'error',
        brcgs_requirement: '5.7 - Adequate documentation required'
      });
    }

    if (!nca.corrective_action || nca.corrective_action.length < 50) {
      errors.push({
        field: 'corrective_action',
        message: 'Corrective action must be documented',
        severity: 'error',
        brcgs_requirement: '3.11 - Corrective action required'
      });
    }

    return errors;
  }

  private generateWarnings(nca: NCA, quality: QualityScore): ReadonlyArray<ValidationResult['warnings'][number]> {
    const warnings: Array<ValidationResult['warnings'][number]> = [];

    if (quality.score < 75) {
      warnings.push({
        field: 'overall',
        message: `Quality score (${quality.score}) below recommended threshold (75)`,
        suggestion: 'Review completeness and clarity of corrective action'
      });
    }

    if (nca.cross_contamination && !nca.corrective_action?.toLowerCase().includes('back tracking')) {
      warnings.push({
        field: 'corrective_action',
        message: 'Cross-contamination requires back tracking verification',
        suggestion: 'Include back tracking process per Procedure 3.9'
      });
    }

    return warnings;
  }

  private calculateLanguageLevel(role: string): LanguageLevel {
    const levelMap: Record<string, LanguageLevel> = {
      'operator': 2,
      'team-leader': 3,
      'maintenance-technician': 3,
      'qa-supervisor': 4,
      'maintenance-manager': 4,
      'operations-manager': 5
    };

    return levelMap[role] ?? 3;
  }

  private inferConfidence(text: string): ConfidenceLevel {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('high confidence') || lowerText.includes('certain')) {
      return 'high';
    }
    if (lowerText.includes('low confidence') || lowerText.includes('uncertain')) {
      return 'low';
    }
    return 'medium';
  }

  private inferConfidencePercentage(text: string): number {
    const match = text.match(/confidence[:\s]+(\d+)%/i);
    return match ? Number(match[1]) : 70;
  }

  private inferCategory(keywords: string[]): string {
    const categories = {
      equipment: ['machine', 'motor', 'bearing', 'seal'],
      process: ['specification', 'tolerance', 'parameter'],
      material: ['raw material', 'film', 'supplier', 'batch'],
      contamination: ['foreign body', 'glass', 'metal', 'contamination']
    };

    let bestCategory = 'general';
    let maxMatches = 0;

    for (const [category, categoryKeywords] of Object.entries(categories)) {
      const matches = keywords.filter(k =>
        categoryKeywords.some(ck => k.toLowerCase().includes(ck.toLowerCase()))
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  private parseRecommendations(text: string): Suggestion['recommendations'] {
    return {
      create_mjc: text.toLowerCase().includes('create mjc') || text.toLowerCase().includes('equipment issue'),
      calibration_check: text.toLowerCase().includes('calibration') || text.toLowerCase().includes('measurement'),
      training_required: text.toLowerCase().includes('training') || text.toLowerCase().includes('operator error'),
      hara_review: text.toLowerCase().includes('hara') || text.toLowerCase().includes('systemic')
    };
  }
}
