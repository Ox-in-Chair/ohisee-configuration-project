/**
 * IAIService Interface
 * Dependency injection contract for AI quality analysis
 *
 * CRITICAL: All implementations must be testable via dependency injection.
 * No static methods. All external dependencies injected via constructor.
 */

import {
  AnalysisContext,
  QualityScore,
  Suggestion,
  HazardClassification,
  ValidationResult,
  NCA,
  User
} from './types';

/**
 * Core AI service interface for BRCGS compliance quality analysis
 */
export interface IAIService {
  /**
   * Analyze field quality in real-time (inline suggestions)
   * Timeout: <2s for fast feedback
   *
   * @param context - Analysis context including user, training status, and form data
   * @returns Quality score breakdown (0-100)
   * @throws AIServiceError on failure
   */
  analyzeFieldQuality(context: AnalysisContext): Promise<QualityScore>;

  /**
   * Generate AI suggestions for corrective actions or maintenance
   * Mode: adaptive (fast inline vs deep validation)
   *
   * @param context - Full context including similar historical cases
   * @returns Structured suggestion with quality score and procedure references
   * @throws AIServiceError on failure
   */
  generateSuggestions(context: AnalysisContext): Promise<Suggestion>;

  /**
   * Classify hazard type from description
   * Uses 11 BRCGS hazard categories
   *
   * @param description - Issue description text
   * @returns Hazard classification with severity and control measures
   * @throws AIServiceError on failure
   */
  classifyHazard(description: string): Promise<HazardClassification>;

  /**
   * Validate complete NCA before submission
   * Comprehensive validation with quality gates
   * Timeout: 10-30s for deep analysis
   *
   * @param nca - Complete NCA record
   * @param user - Current user for authority checks
   * @returns Validation result with errors, warnings, and quality assessment
   * @throws AIServiceError on failure
   */
  validateBeforeSubmit(nca: NCA, user: User): Promise<ValidationResult>;
}

/**
 * Anthropic client dependency
 * Injected to allow mocking in tests
 */
export interface IAnthropicClient {
  messages: {
    create: (params: AnthropicMessageRequest) => Promise<AnthropicMessageResponse>;
    stream: (params: AnthropicMessageRequest) => AsyncIterable<AnthropicStreamEvent>;
  };
}

export interface AnthropicMessageRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly temperature?: number;
  readonly messages: ReadonlyArray<AnthropicMessage>;
  readonly stream?: boolean;
  readonly system?: string;
}

export interface AnthropicMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface AnthropicMessageResponse {
  readonly id: string;
  readonly type: 'message';
  readonly role: 'assistant';
  readonly content: ReadonlyArray<AnthropicContent>;
  readonly model: string;
  readonly stop_reason: string | null;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  };
}

export interface AnthropicContent {
  readonly type: 'text';
  readonly text: string;
}

export interface AnthropicStreamEvent {
  readonly type: string;
  readonly delta?: { type: string; text?: string };
  readonly content_block?: AnthropicContent;
  readonly message?: AnthropicMessageResponse;
}

/**
 * Knowledge base service dependency
 * RAG system for procedure retrieval and similar case matching
 */
export interface IKnowledgeBaseService {
  /**
   * Search BRCGS procedures by relevance
   */
  searchProcedures(
    query: string,
    limit?: number
  ): Promise<ReadonlyArray<{ procedure_number: string; content: string; relevance: number }>>;

  /**
   * Find similar historical NCAs/MJCs
   */
  findSimilarCases(
    description: string,
    record_type: 'nca' | 'mjc',
    limit?: number
  ): Promise<ReadonlyArray<{ id: string; description: string; action: string; similarity: number }>>;

  /**
   * Get specific procedure by number
   */
  getProcedure(procedure_number: string): Promise<{ title: string; content: string } | null>;
}

/**
 * Audit logging dependency
 * Track all AI interactions for BRCGS audit trail
 */
export interface IAuditLogger {
  /**
   * Log AI interaction with full context
   */
  logInteraction(params: {
    user_id: string;
    user_role: string;
    query_type: string;
    query_context: unknown;
    response: unknown;
    quality_score?: number;
    confidence?: string;
    procedure_references?: ReadonlyArray<string>;
    escalation_triggered?: boolean;
  }): Promise<void>;

  /**
   * Log user feedback on AI suggestion
   */
  logFeedback(params: {
    record_id: string;
    record_type: 'nca' | 'mjc';
    ai_suggestion: string;
    user_edited_version?: string;
    accepted: boolean;
    rating?: number;
    feedback?: string;
  }): Promise<void>;
}

/**
 * Rate limiter dependency
 * Prevent API abuse and manage costs
 */
export interface IRateLimiter {
  /**
   * Check if request is allowed under rate limits
   * @returns true if allowed, false if rate limited
   */
  checkLimit(user_id: string): Promise<boolean>;

  /**
   * Record request for rate limiting
   */
  recordRequest(user_id: string): Promise<void>;

  /**
   * Get remaining requests for user
   */
  getRemainingRequests(user_id: string): Promise<number>;
}
