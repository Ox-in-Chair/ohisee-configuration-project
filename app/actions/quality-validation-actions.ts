'use server';

import { createAIService } from '@/lib/ai';
import {
  validateDescriptionCompleteness,
  validateRootCauseDepth,
  validateCorrectiveActionSpecificity,
  detectVagueLanguage,
  requireSpecificDetails,
} from '@/lib/services/quality-enforcement-service';
import {
  adaptValidationToEnforcementLevel,
  getEnforcementLevel,
  getEscalationMessage,
  type EnforcementAttempt,
} from '@/lib/services/adaptive-enforcement';
import { logEnforcementAction, getAttemptNumber } from '@/lib/services/enforcement-logger';
import { getPhase7Config } from '@/lib/config/phase7-config';
import { MultiAgentOrchestrator } from '@/lib/ai/multi-agent/orchestrator';
import { EnhancedRAGService } from '@/lib/ai/rag/enhanced-rag-service';
import { UserGuidedGenerationService } from '@/lib/ai/user-guided/generation-service';
import { TransparencyService } from '@/lib/ai/explainable/transparency-service';
import { createServerClient } from '@/lib/database/client';
import type {
  NCA,
  MJC,
  QualityScore,
  Suggestion,
  ValidationResult,
  HazardClassification,
  User,
} from '@/lib/ai/types';

/**
 * Server Actions for Quality Validation
 * Rule-based validation runs first, then AI analysis (invisible to users)
 * All responses frame validation as standard system requirements, not AI opinions
 */

export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate field quality inline (fast mode, <2s)
 * Runs rule-based validation first, then AI analysis for deeper insights
 * Used for real-time feedback as user types
 */
export async function validateFieldQualityAction(
  formType: 'nca' | 'mjc',
  fieldData: Partial<NCA> | Partial<MJC>,
  userId: string
): Promise<ServerActionResult<QualityScore>> {
  try {
    // Step 1: Run rule-based validation first (fast, no AI needed)
    if (formType === 'nca') {
      const ncaData = fieldData as Partial<NCA>;

      // Validate description if present
      if (ncaData.nc_description && ncaData.nc_type) {
        const descValidation = validateDescriptionCompleteness(
          ncaData.nc_description,
          ncaData.nc_type
        );
        if (!descValidation.valid) {
          // Return early with rule-based feedback (no AI needed for obvious issues)
          return {
            success: true,
            data: {
              score: 50, // Low score due to rule violations
              threshold_met: false,
              breakdown: {
                completeness: 10,
                accuracy: 10,
                clarity: 10,
                hazard_identification: 10,
                evidence: 10,
              },
            },
          };
        }
      }

      // Validate root cause if present
      if (ncaData.root_cause_analysis) {
        const rootCauseValidation = validateRootCauseDepth(ncaData.root_cause_analysis);
        if (!rootCauseValidation.valid) {
          return {
            success: true,
            data: {
              score: 55,
              threshold_met: false,
              breakdown: {
                completeness: 15,
                accuracy: 15,
                clarity: 10,
                hazard_identification: 10,
                evidence: 5,
              },
            },
          };
        }
      }

      // Validate corrective action if present
      if (ncaData.corrective_action) {
        const actionValidation = validateCorrectiveActionSpecificity(ncaData.corrective_action);
        if (!actionValidation.valid) {
          return {
            success: true,
            data: {
              score: 60,
              threshold_met: false,
              breakdown: {
                completeness: 20,
                accuracy: 15,
                clarity: 15,
                hazard_identification: 5,
                evidence: 5,
              },
            },
          };
        }
      }
    }

    // Step 2: If rule-based checks pass, run AI analysis for deeper insights
    const aiService = createAIService();

    const language_level = 4;

    const user: User = {
      id: userId,
      role: 'operator',
      name: 'Current User',
      department: 'Quality',
      induction_completed: true,
      induction_date: new Date().toISOString(),
    };

    const qualityScore = await aiService.analyzeFieldQuality({
      user,
      language_level,
      [formType]: fieldData,
    });

    return {
      success: true,
      data: qualityScore,
    };
  } catch (error) {
    console.error('Field validation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Get writing assistance for a field
 * Provides suggestions based on procedures and best practices
 * Enhanced with Phase 7: User-Guided Generation and Enhanced RAG
 */
export async function getWritingAssistanceAction(
  formType: 'nca' | 'mjc',
  formData: Partial<NCA> | Partial<MJC>,
  userId: string,
  fieldName?: string,
  userPrompt?: string
): Promise<ServerActionResult<Suggestion>> {
  try {
    const config = getPhase7Config();

    // Always use RAG service for field-specific rewriting when fieldName is provided
    // This ensures we rewrite the specific field text, not generate a full corrective action
    if (fieldName) {
      const ragService = new EnhancedRAGService();

      const currentValue = (formData as any)[fieldName] || '';
      const ragSuggestion = await ragService.generateSuggestionWithRAG(
        fieldName,
        currentValue,
        formData,
        formType,
        config.rag?.fineTuning
      );

      // Convert to Suggestion format
      return {
        success: true,
        data: {
          text: ragSuggestion.suggestion,
          sections: {} as any,
          quality_score: Math.round(ragSuggestion.confidence * 100),
          confidence: ragSuggestion.confidence > 0.8 ? 'high' : 'medium',
          confidence_percentage: Math.round(ragSuggestion.confidence * 100),
          procedure_references: ragSuggestion.sources.filter(s => s.match(/^\d+\.\d+/)),
          keywords_detected: {
            category: 'general',
            keywords: [],
          },
          recommendations: {},
        },
      };
    }

    // Fallback: Only use standard AI service if no fieldName provided (shouldn't happen in normal flow)
    const aiService = createAIService();

    const language_level = 4;

    const user: User = {
      id: userId,
      role: 'operator',
      name: 'Current User',
      department: 'Quality',
      induction_completed: true,
      induction_date: new Date().toISOString(),
    };

    const suggestion = await aiService.generateSuggestions({
      user,
      language_level,
      [formType]: formData,
    });

    return {
      success: true,
      data: suggestion,
    };
  } catch (error) {
    console.error('Writing assistance failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get writing assistance',
    };
  }
}

/**
 * Validate form before submission (deep validation)
 * Runs rule-based checks first, then AI analysis
 * Applies adaptive enforcement based on attempt number
 * This is the submission validation gate
 */
export async function validateSubmissionAction(
  formType: 'nca' | 'mjc',
  formData: NCA | MJC,
  userId: string,
  isConfidential: boolean = false,
  attemptNumber?: number,
  formId?: string
): Promise<ServerActionResult<ValidationResult>> {
  try {
    // Get attempt number if not provided
    const currentAttemptNumber = attemptNumber || (await getAttemptNumber(formType, formId, userId));
    // Bypass validation for confidential reports
    if (isConfidential) {
      return {
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 100,
            threshold_met: true,
            breakdown: {
              completeness: 30,
              accuracy: 25,
              clarity: 20,
              hazard_identification: 15,
              evidence: 10,
            },
          },
          errors: [],
          warnings: [],
        },
      };
    }

    // Step 1: Run rule-based validation first
    if (formType === 'nca') {
      const ncaData = formData as NCA;
      const ruleErrors: any[] = [];
      const ruleWarnings: any[] = [];

      // Validate description
      if (ncaData.nc_description && ncaData.nc_type) {
        const descValidation = validateDescriptionCompleteness(
          ncaData.nc_description,
          ncaData.nc_type
        );
        descValidation.issues.forEach((issue) => {
          if (issue.severity === 'error') {
            ruleErrors.push({
              field: issue.field,
              message: issue.message,
              brcgs_requirement: issue.brcgsReference,
            });
          } else {
            ruleWarnings.push({
              field: issue.field,
              message: issue.message,
              suggestion: issue.exampleFix,
              brcgs_requirement: issue.brcgsReference,
            });
          }
        });
      }

      // Validate root cause
      if (ncaData.root_cause_analysis) {
        const rootCauseValidation = validateRootCauseDepth(ncaData.root_cause_analysis);
        rootCauseValidation.issues.forEach((issue) => {
          if (issue.severity === 'error') {
            ruleErrors.push({
              field: issue.field,
              message: issue.message,
              brcgs_requirement: issue.brcgsReference,
            });
          } else {
            ruleWarnings.push({
              field: issue.field,
              message: issue.message,
              suggestion: issue.exampleFix,
            });
          }
        });
      }

      // Validate corrective action
      if (ncaData.corrective_action) {
        const actionValidation = validateCorrectiveActionSpecificity(ncaData.corrective_action);
        actionValidation.issues.forEach((issue) => {
          ruleWarnings.push({
            field: issue.field,
            message: issue.message,
            suggestion: issue.exampleFix,
            brcgs_requirement: issue.brcgsReference,
          });
        });
      }

      // Collect all validation issues
      const allIssues: Array<{ field: string; message: string; severity: 'error' | 'warning'; brcgsReference?: string; exampleFix?: string }> = [];
      
      ruleErrors.forEach((error) => {
        allIssues.push({
          field: error.field,
          message: error.message,
          severity: 'error',
          brcgsReference: error.brcgs_requirement,
        });
      });
      
      ruleWarnings.forEach((warning) => {
        allIssues.push({
          field: warning.field,
          message: warning.message,
          severity: 'warning',
          brcgsReference: warning.brcgs_requirement,
          exampleFix: warning.suggestion,
        });
      });

      // Apply adaptive enforcement based on attempt number
      const adaptiveResult = adaptValidationToEnforcementLevel(allIssues, currentAttemptNumber);

      // Log enforcement action to database (internal audit only)
      await logEnforcementAction({
        formType,
        formId,
        userId,
        attemptNumber: currentAttemptNumber,
        enforcementLevel: adaptiveResult.enforcementLevel,
        validationResult: {
          valid: false,
          ready_for_submission: false,
        },
        issuesFound: allIssues,
        requirementsMissing: adaptiveResult.requirements,
        errorsBlocking: adaptiveResult.errors,
        actionTaken: adaptiveResult.requiresManagerApproval
          ? 'manager_approval_required'
          : 'submission_blocked',
        managerApprovalRequested: adaptiveResult.requiresManagerApproval,
      });

      // If adaptive enforcement requires manager approval or has blocking errors, return early
      if (adaptiveResult.requiresManagerApproval || adaptiveResult.errors.length > 0) {
        return {
          success: true,
          data: {
            valid: false,
            ready_for_submission: false,
            requirements: adaptiveResult.requirements.length > 0 ? adaptiveResult.requirements : undefined,
            errors: adaptiveResult.errors,
            warnings: adaptiveResult.warnings,
            quality_assessment: {
              score: adaptiveResult.requiresManagerApproval ? 30 : 40,
              threshold_met: false,
              breakdown: {
                completeness: 10,
                accuracy: 10,
                clarity: 10,
                hazard_identification: 5,
                evidence: 5,
              },
            },
          },
        };
      }
    }

    // Step 2: Run AI validation for deeper analysis (invisible to users)
    const config = getPhase7Config();
    const user: User = {
      id: userId,
      role: 'operator',
      name: 'Current User',
      department: 'Quality',
      induction_completed: true,
      induction_date: new Date().toISOString(),
    };

    let validation: ValidationResult;
    let agentTraces: any[] | undefined;

    // Use multi-agent system if enabled
    if (config.multiAgent.enabled && formType === 'nca') {
      const orchestrator = new MultiAgentOrchestrator({
        enableContentCompletion: config.multiAgent.agents.contentCompletion,
        enableAnomalyDetection: config.multiAgent.agents.anomalyDetection,
        enableContextAlignment: config.multiAgent.agents.contextAlignment,
        conflictResolution: config.multiAgent.conflictResolution,
        parallelExecution: config.multiAgent.parallelExecution,
      });

      validation = await orchestrator.validateSubmission(formData as NCA, user, formType);
      
      // Capture agent traces for explainable AI
      // Note: In production, orchestrator would return agent traces
      // For now, we'll create them from the validation result
      if (config.explainableAI.enabled) {
        agentTraces = []; // Placeholder - would contain actual agent results
      }
    } else {
      // Fallback to single-agent AI service
      const aiService = createAIService();

      // AI service currently only supports NCA validation
      if (formType === 'mjc') {
        return {
          success: true,
          data: {
            valid: true,
            ready_for_submission: true,
            quality_assessment: {
              score: 75,
              threshold_met: true,
              breakdown: {
                completeness: 23,
                accuracy: 19,
                clarity: 15,
                hazard_identification: 11,
                evidence: 7,
              },
            },
            errors: [],
            warnings: [],
          },
        };
      }

      validation = await aiService.validateBeforeSubmit(formData as NCA, user);
    }

    // Merge rule-based requirements with AI validation results and apply adaptive enforcement
    if (formType === 'nca') {
      const ncaData = formData as NCA;
      const ruleIssues: Array<{ field: string; message: string; severity: 'error' | 'warning'; brcgsReference?: string; exampleFix?: string }> = [];

      // Check corrective action for requirements
      if (ncaData.corrective_action) {
        const actionValidation = validateCorrectiveActionSpecificity(ncaData.corrective_action);
        actionValidation.issues.forEach((issue) => {
          ruleIssues.push({
            field: issue.field,
            message: issue.message,
            severity: issue.severity,
            brcgsReference: issue.brcgsReference,
            exampleFix: issue.exampleFix,
          });
        });
      }

      // Apply adaptive enforcement to rule-based issues
      if (ruleIssues.length > 0) {
        const adaptiveResult = adaptValidationToEnforcementLevel(ruleIssues, currentAttemptNumber);

        // Merge adaptive requirements with AI requirements
        validation = {
          ...validation,
          requirements: [
            ...(validation.requirements || []),
            ...adaptiveResult.requirements,
          ],
          errors: [
            ...(validation.errors || []),
            ...adaptiveResult.errors,
          ],
          warnings: adaptiveResult.warnings
            ? [...(validation.warnings || []), ...adaptiveResult.warnings]
            : validation.warnings,
          ready_for_submission: adaptiveResult.requiresManagerApproval ? false : validation.ready_for_submission,
          valid: adaptiveResult.requiresManagerApproval ? false : validation.valid,
        };
      }
    }

    // Step 3: Create decision trace for explainable AI (if enabled)
    if (config.explainableAI.enabled) {
      const transparency = new TransparencyService();
      const trace = transparency.createDecisionTrace(
        formType,
        formId,
        userId,
        validation,
        agentTraces
      );

      // Store decision trace in database
      try {
        const supabase = createServerClient();
        await (supabase.rpc as any)('create_decision_trace', {
          p_form_type: formType,
          p_form_id: formId || null,
          p_user_id: userId,
          p_validation_result: validation as any,
          p_explanations: trace.explanations as any,
          p_agent_traces: agentTraces ? (agentTraces as any) : null,
          p_policy_version: trace.policyVersion,
        });
      } catch (error) {
        console.error('Failed to create decision trace:', error);
        // Don't fail validation if trace logging fails
      }
    }

    return {
      success: true,
      data: validation,
    };
  } catch (error) {
    console.error('Submission validation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Classify hazard from NC description
 */
export async function classifyHazardAction(
  description: string,
  userId: string
): Promise<ServerActionResult<HazardClassification>> {
  try {
    const aiService = createAIService();

    const hazard = await aiService.classifyHazard(description);

    return {
      success: true,
      data: hazard,
    };
  } catch (error) {
    console.error('Hazard classification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Hazard classification failed',
    };
  }
}

/**
 * Record when user accepts a writing suggestion
 * Used for learning and improvement
 */
export async function recordSuggestionOutcomeAction(
  suggestionId: string,
  accepted: boolean,
  originalText: string,
  finalText: string,
  userId: string
): Promise<ServerActionResult<void>> {
  try {
    // TODO: Implement feedback recording in database
    console.log('Recording suggestion outcome:', {
      suggestionId,
      accepted,
      editsCount: originalText !== finalText ? 1 : 0,
      userId,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to record suggestion outcome:', error);
    return {
      success: false,
      error: 'Failed to record feedback',
    };
  }
}

/**
 * Record manager approval when validation is bypassed
 * Critical for audit trail
 */
export async function recordManagerApprovalAction(
  formType: 'nca' | 'mjc',
  formId: string,
  qualityScore: number,
  justification: string,
  managerId: string
): Promise<ServerActionResult<void>> {
  try {
    // TODO: Implement approval recording in database
    // Must be logged for BRCGS compliance
    console.log('Recording manager approval:', {
      formType,
      formId,
      qualityScore,
      justification,
      managerId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to record manager approval:', error);
    return {
      success: false,
      error: 'Failed to record approval',
    };
  }
}

// Re-export old function names for backward compatibility during migration
export const analyzeFieldQualityAction = validateFieldQualityAction;
export const generateSuggestionsAction = getWritingAssistanceAction;
export const validateBeforeSubmitAction = validateSubmissionAction;
export const recordSupervisorOverrideAction = recordManagerApprovalAction;

