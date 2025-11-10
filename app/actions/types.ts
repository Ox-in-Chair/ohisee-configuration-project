/**
 * Server Actions Type Definitions
 * Shared types for AI and Knowledge Base actions
 */

// ============================================================================
// Base Response Type
// ============================================================================

/**
 * Standard Server Action response format
 * Ensures consistent error handling across all actions
 *
 * @template T - Type of success response data
 */
export interface ActionResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

// ============================================================================
// AI Quality Analysis Types
// ============================================================================

/**
 * Inline quality analysis response
 * Fast feedback during form editing
 */
export interface InlineQualityResponse {
  readonly score: number; // 0-100
  readonly suggestions: ReadonlyArray<string>;
}

/**
 * User quality metrics for dashboard
 */
export interface UserQualityMetrics {
  readonly user_id: string;
  readonly period: '30d' | '90d' | '180d';
  readonly total_submissions: number;
  readonly avg_quality_score: number;
  readonly ai_acceptance_rate: number;
  readonly revision_count: number;
  readonly top_improvement_areas: ReadonlyArray<ImprovementArea>;
  readonly trend: 'improving' | 'stable' | 'declining';
}

export interface ImprovementArea {
  readonly field: string;
  readonly avg_score: number;
  readonly suggestion: string;
}

/**
 * Manager dashboard aggregated data
 */
export interface ManagerDashboard {
  readonly team_stats: TeamStats;
  readonly user_performance: ReadonlyArray<UserPerformance>;
  readonly ai_effectiveness: AIEffectiveness;
  readonly quality_trends: ReadonlyArray<QualityTrend>;
}

export interface TeamStats {
  readonly total_ncas: number;
  readonly total_mjcs: number;
  readonly avg_quality_score: number;
  readonly quality_gate_pass_rate: number;
}

export interface UserPerformance {
  readonly user_id: string;
  readonly user_name: string;
  readonly user_role: string;
  readonly submissions: number;
  readonly avg_quality: number;
  readonly ai_acceptance_rate: number;
}

export interface AIEffectiveness {
  readonly total_suggestions: number;
  readonly acceptance_rate: number;
  readonly avg_confidence: number;
  readonly top_procedures_cited: ReadonlyArray<ProcedureCitation>;
}

export interface ProcedureCitation {
  readonly procedure: string;
  readonly count: number;
}

export interface QualityTrend {
  readonly date: string;
  readonly avg_score: number;
  readonly submission_count: number;
}

/**
 * Dashboard filter options
 */
export interface DashboardFilters {
  readonly start_date?: string;
  readonly end_date?: string;
  readonly department?: string;
  readonly record_type?: 'nca' | 'mjc';
}

// ============================================================================
// Knowledge Base Types
// ============================================================================

/**
 * Procedure metadata for upload
 */
export interface ProcedureMetadata {
  readonly document_number: string;
  readonly document_name: string;
  readonly document_type: DocumentType;
  readonly revision: number;
  readonly brcgs_section?: string;
  readonly effective_date: string;
  readonly review_due_date?: string;
  readonly summary?: string;
  readonly key_requirements?: Record<string, unknown>;
  readonly integration_points?: ReadonlyArray<string>;
  readonly form_sections?: ReadonlyArray<string>;
}

export type DocumentType =
  | 'procedure'
  | 'form_template'
  | 'work_instruction'
  | 'policy'
  | 'training'
  | 'record';

export type DocumentStatus = 'current' | 'superseded' | 'draft' | 'obsolete';

/**
 * Complete procedure record
 */
export interface Procedure extends ProcedureMetadata {
  readonly id: string;
  readonly status: DocumentStatus;
  readonly revised_date: string;
  readonly full_text: string;
  readonly search_keywords?: ReadonlyArray<string>;
  readonly uploaded_at: string;
  readonly reference_count: number;
}

/**
 * Knowledge base search result
 */
export interface KnowledgeBaseResult {
  readonly procedure_number: string;
  readonly procedure_title: string;
  readonly content: string;
  readonly relevance_score: number; // 0-1
  readonly revision: number;
  readonly effective_date: string;
}

/**
 * Procedure list filters
 */
export interface ProcedureFilters {
  readonly status?: DocumentStatus;
  readonly document_type?: DocumentType;
  readonly brcgs_section?: string;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Procedure metadata update (partial)
 */
export type ProcedureMetadataUpdate = Partial<
  Pick<
    ProcedureMetadata,
    'summary' | 'key_requirements' | 'integration_points' | 'form_sections' | 'review_due_date'
  >
>;

// ============================================================================
// Database Quality Score Types
// ============================================================================

/**
 * NCA quality score record
 */
export interface NCAQualityScoreInsert {
  readonly nca_id: string;
  readonly total_score: number;
  readonly completeness_score: number;
  readonly accuracy_score: number;
  readonly clarity_score: number;
  readonly hazard_identification_score: number;
  readonly evidence_score: number;
  readonly threshold_met: boolean;
  readonly validation_timestamp: string;
}

/**
 * MJC quality score record
 */
export interface MJCQualityScoreInsert {
  readonly mjc_id: string;
  readonly total_score: number;
  readonly completeness_score: number;
  readonly accuracy_score: number;
  readonly clarity_score: number;
  readonly safety_score: number;
  readonly evidence_score: number;
  readonly threshold_met: boolean;
  readonly validation_timestamp: string;
}

/**
 * AI corrective action suggestion record
 */
export interface AICorrectiveActionInsert {
  readonly nca_id: string;
  readonly user_id: string;
  readonly suggestion_text: string;
  readonly sections: {
    readonly immediate_correction?: string;
    readonly root_cause?: string;
    readonly corrective_action?: string;
    readonly verification: string;
  };
  readonly quality_score: number;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly confidence_percentage: number;
  readonly procedure_references: ReadonlyArray<string>;
  readonly keywords_detected: {
    readonly category: string;
    readonly keywords: ReadonlyArray<string>;
  };
  readonly recommendations: {
    readonly create_mjc?: boolean;
    readonly calibration_check?: boolean;
    readonly training_required?: boolean;
    readonly hara_review?: boolean;
  };
}

/**
 * AI maintenance action suggestion record
 */
export interface AIMaintenanceActionInsert {
  readonly mjc_id: string;
  readonly user_id: string;
  readonly suggestion_text: string;
  readonly sections: {
    readonly maintenance_scope?: string;
    readonly safety_considerations?: string;
    readonly contamination_prevention?: string;
    readonly hygiene_clearance?: string;
    readonly verification: string;
  };
  readonly quality_score: number;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly confidence_percentage: number;
  readonly procedure_references: ReadonlyArray<string>;
  readonly keywords_detected: {
    readonly category: string;
    readonly keywords: ReadonlyArray<string>;
  };
  readonly recommendations: {
    readonly create_mjc?: boolean;
    readonly calibration_check?: boolean;
    readonly training_required?: boolean;
    readonly hara_review?: boolean;
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * AI Service error codes
 */
export type AIErrorCode =
  | 'insufficient_input'
  | 'analysis_failed'
  | 'low_confidence'
  | 'timeout'
  | 'validation_failed'
  | 'api_error'
  | 'rate_limit_exceeded';

/**
 * Type guard for rate limit errors
 */
export function isRateLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'rate_limit_exceeded'
  );
}

/**
 * Type guard for low confidence errors
 */
export function isLowConfidenceError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'low_confidence'
  );
}

// ============================================================================
// Validation Types (from AI Service)
// ============================================================================

/**
 * Re-export ValidationResult from AI types for convenience
 * (Already defined in @/lib/ai/types)
 */
export type { ValidationResult, ValidationError, ValidationWarning } from '@/lib/ai/types';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract success data type from ActionResponse
 */
export type ActionData<T> = T extends ActionResponse<infer U> ? U : never;

/**
 * Make ActionResponse fields required (for type narrowing after success check)
 */
export type SuccessResponse<T> = Required<Pick<ActionResponse<T>, 'success' | 'data'>> &
  Omit<ActionResponse<T>, 'success' | 'data'>;

export type ErrorResponse = Required<Pick<ActionResponse, 'success' | 'error'>> &
  Omit<ActionResponse, 'success' | 'error'>;
