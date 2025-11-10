/**
 * AI Service Module Exports
 * Main entry point for AI quality analysis functionality
 */

// Core service and interfaces
export { AIService } from './ai-service';
export type { IAIService, IKnowledgeBaseService, IAuditLogger, IRateLimiter } from './ai-service.interface';

// Types
export type {
  AnalysisContext,
  QualityScore,
  QualityBreakdown,
  Suggestion,
  HazardClassification,
  ValidationResult,
  NCA,
  MJC,
  User,
  UserRole,
  LanguageLevel,
  CompetencyStatus,
  AIConfig,
  AIMode,
  ConfidenceLevel,
  AIServiceError
} from './types';

// Quality scorer
export { QualityScorer } from './quality-scorer';

// Prompt templates
export { NCAQualityScoringPrompt } from './prompts/nca-quality-scoring';
export { MJCQualityScoringPrompt } from './prompts/mjc-quality-scoring';
export { HazardClassificationPrompt } from './prompts/hazard-classification';
export { RoleAdaptationPrompt } from './prompts/role-adaptation';

// RAG system
export { KnowledgeBaseService } from './rag/knowledge-base-service';

// Infrastructure
export { AuditLogger } from './audit-logger';
export { RateLimiter } from './rate-limiter';

// Factory function
export { createAIService } from './factory';
