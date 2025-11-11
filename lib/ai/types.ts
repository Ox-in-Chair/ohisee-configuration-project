/**
 * AI Service Type Definitions
 * Comprehensive type safety for AI quality analysis system
 */

// ============================================================================
// User & Role Types
// ============================================================================

export type UserRole =
  | 'operator'
  | 'team-leader'
  | 'maintenance-technician'
  | 'qa-supervisor'
  | 'maintenance-manager'
  | 'operations-manager';

export type LanguageLevel = 1 | 2 | 3 | 4 | 5;

export type CompetencyStatus = 'not-trained' | 'trained-not-competent' | 'competent' | 'refresher-required';

export interface User {
  readonly id: string;
  readonly role: UserRole;
  readonly name: string;
  readonly department: string;
  readonly induction_completed: boolean;
  readonly induction_date: string | null;
}

export interface TrainingStatus {
  readonly training_module: string;
  readonly completion_date: string | null;
  readonly competency_status: CompetencyStatus;
  readonly refresher_required: boolean;
  readonly last_refresher_date: string | null;
  readonly procedure_revised_since_training: boolean;
}

// ============================================================================
// NCA Types (from BRCGS specs)
// ============================================================================

export type NCAType = 'raw-material' | 'finished-goods' | 'wip' | 'incident' | 'other';

export type MachineStatus = 'down' | 'operational';

export interface NCA {
  readonly nca_id: string;
  readonly nc_description: string;
  readonly nc_type: NCAType;
  readonly nc_type_other?: string;
  readonly machine_status: MachineStatus;
  readonly machine_down_since?: string;
  readonly cross_contamination: boolean;
  readonly disposition_rework: boolean;
  readonly disposition_concession: boolean;
  readonly root_cause_analysis?: string;
  readonly corrective_action?: string;
  readonly work_order_id?: string;
}

// ============================================================================
// MJC Types
// ============================================================================

export type MaintenanceCategory = 'reactive' | 'planned';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface MJC {
  readonly mjc_id: string;
  readonly description_required: string;
  readonly maintenance_category: MaintenanceCategory;
  readonly maintenance_type_electrical: boolean;
  readonly maintenance_type_mechanical: boolean;
  readonly maintenance_type_pneumatical: boolean;
  readonly maintenance_type_other?: string;
  readonly machine_status: MachineStatus;
  readonly urgency: UrgencyLevel;
  readonly temporary_repair: boolean;
  readonly machine_equipment: string;
  readonly maintenance_performed?: string;
}

// ============================================================================
// AI Analysis Context
// ============================================================================

export interface AnalysisContext {
  readonly user: User;
  readonly training_status?: TrainingStatus;
  readonly language_level: LanguageLevel;
  readonly nca?: NCA;
  readonly mjc?: MJC;
  readonly procedure_context?: ReadonlyArray<string>; // BRCGS procedure references
  readonly historical_similar?: ReadonlyArray<SimilarCase>;
}

export interface SimilarCase {
  readonly record_id: string;
  readonly record_type: 'nca' | 'mjc';
  readonly description: string;
  readonly corrective_action: string;
  readonly quality_score: number;
  readonly similarity_score: number; // 0-1 from vector search
}

// ============================================================================
// AI Response Types
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface QualityScore {
  readonly score: number; // 0-100
  readonly breakdown: QualityBreakdown;
  readonly threshold_met: boolean; // score >= AI_QUALITY_THRESHOLD
}

export interface QualityBreakdown {
  readonly completeness: number; // 0-30
  readonly accuracy: number; // 0-25
  readonly clarity: number; // 0-20
  readonly hazard_identification: number; // 0-15
  readonly evidence: number; // 0-10
}

export interface Suggestion {
  readonly text: string;
  readonly sections: SuggestionSections;
  readonly quality_score: number;
  readonly confidence: ConfidenceLevel;
  readonly confidence_percentage: number;
  readonly procedure_references: ReadonlyArray<string>;
  readonly keywords_detected: KeywordAnalysis;
  readonly recommendations: Recommendations;
}

export interface SuggestionSections {
  readonly immediate_correction?: string; // NCAs only
  readonly root_cause?: string; // NCAs only
  readonly corrective_action?: string; // NCAs only
  readonly maintenance_scope?: string; // MJCs only
  readonly safety_considerations?: string; // MJCs only
  readonly contamination_prevention?: string; // MJCs only
  readonly hygiene_clearance?: string; // MJCs only (10 items)
  readonly verification: string; // Both
}

export interface KeywordAnalysis {
  readonly category: string;
  readonly keywords: ReadonlyArray<string>;
}

export interface Recommendations {
  readonly create_mjc?: boolean;
  readonly calibration_check?: boolean;
  readonly training_required?: boolean;
  readonly hara_review?: boolean;
}

// ============================================================================
// Hazard Classification (11 BRCGS types)
// ============================================================================

export type HazardType =
  | 'microbiological'
  | 'chemical'
  | 'physical'
  | 'allergen'
  | 'radiological'
  | 'nutritional'
  | 'other-biological'
  | 'metal-contamination'
  | 'glass-contamination'
  | 'foreign-body'
  | 'cross-contamination';

export interface HazardClassification {
  readonly hazard_type: HazardType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'certain';
  readonly risk_level: number; // severity × likelihood
  readonly control_measures: ReadonlyArray<string>;
  readonly brcgs_section: string; // e.g., "5.8"
  readonly confidence: ConfidenceLevel;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  readonly valid: boolean;
  readonly ready_for_submission: boolean;
  readonly requirements?: ReadonlyArray<Requirement>; // What must be addressed (missing info)
  readonly errors: ReadonlyArray<ValidationError>; // Critical errors that block submission
  readonly warnings?: ReadonlyArray<ValidationWarning>; // Suggestions for improvement
  readonly quality_assessment: QualityScore;
  readonly compliance?: ComplianceResult; // Summary of compliance check
}

export interface Requirement {
  readonly field: string; // e.g., "Corrective Action"
  readonly message: string; // e.g., "Include at least one verification method with timeline."
  readonly reference?: string; // e.g., "BRCGS 5.7.2" or internal policy reference
  readonly exampleFix?: string; // e.g., "Example: 'QA will verify on next batch (due 10-Oct)'."
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity?: 'critical' | 'error';
  readonly brcgs_requirement?: string;
}

export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly brcgs_requirement?: string;
}

export interface ComplianceResult {
  readonly passed: boolean;
  readonly checked_sections?: ReadonlyArray<string>; // e.g., ["BRCGS 5.7.2", "BRCGS 5.3"]
  readonly notes?: string;
}

// ============================================================================
// AI Mode Configuration
// ============================================================================

export type AIMode = 'fast' | 'adaptive' | 'deep';

export interface AIConfig {
  readonly mode: AIMode;
  readonly model: string;
  readonly quality_threshold: number;
  readonly fast_response_timeout: number; // ms
  readonly deep_validation_timeout: number; // ms
  readonly temperature: number; // 0.3-0.5 for consistency
  readonly max_tokens: number;
}

// ============================================================================
// RAG (Retrieval-Augmented Generation) Types
// ============================================================================

export interface KnowledgeBaseQuery {
  readonly query_text: string;
  readonly procedure_numbers?: ReadonlyArray<string>;
  readonly record_type?: 'nca' | 'mjc';
  readonly limit?: number;
}

export interface KnowledgeBaseResult {
  readonly procedure_number: string;
  readonly procedure_title: string;
  readonly content: string;
  readonly relevance_score: number; // 0-1
}

export interface EmbeddingVector {
  readonly text: string;
  readonly vector: ReadonlyArray<number>; // pgvector format
  readonly metadata: Record<string, unknown>;
}

// ============================================================================
// Audit & Feedback Types
// ============================================================================

export interface AIFeedback {
  readonly record_id: string;
  readonly record_type: 'nca' | 'mjc';
  readonly suggestion_type: 'corrective_action' | 'maintenance_performed';
  readonly ai_suggestion: string;
  readonly user_edited_version?: string;
  readonly suggestion_accepted: boolean;
  readonly user_rating?: 1 | 2 | 3 | 4 | 5;
  readonly user_feedback?: string;
  readonly quality_score: number;
  readonly confidence: ConfidenceLevel;
  readonly keywords_detected: ReadonlyArray<string>;
  readonly procedure_references: ReadonlyArray<string>;
  readonly created_at: string;
}

export interface AIAuditLog {
  readonly interaction_id: string;
  readonly user_id: string;
  readonly timestamp: string;
  readonly user_role: UserRole;
  readonly language_level: LanguageLevel;
  readonly training_status: TrainingStatus;
  readonly query_text: string;
  readonly response_text: string;
  readonly escalation_triggered: boolean;
  readonly escalated_to?: UserRole;
  readonly hygiene_keywords_detected: ReadonlyArray<string>;
  readonly brcgs_procedures_referenced: ReadonlyArray<string>;
  readonly authority_check_passed: boolean;
  readonly medical_exclusion_blocked: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export type AIErrorCode =
  | 'insufficient_input'
  | 'analysis_failed'
  | 'low_confidence'
  | 'timeout'
  | 'validation_failed'
  | 'api_error'
  | 'rate_limit_exceeded';

export class AIServiceError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// ============================================================================
// Prompt Template Types
// ============================================================================

export interface PromptTemplate {
  readonly name: string;
  readonly version: string;
  readonly build: (context: AnalysisContext) => string;
}

export interface PromptContext {
  readonly user_context: string;
  readonly language_adaptation: string;
  readonly terminology_glossary: string;
  readonly brcgs_context: string;
  readonly historical_context?: string;
}
