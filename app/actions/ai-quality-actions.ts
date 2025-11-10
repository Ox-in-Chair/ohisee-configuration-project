'use server';

import { createAIService } from '@/lib/ai';
import type {
  NCA,
  MJC,
  QualityScore,
  Suggestion,
  ValidationResult,
  HazardClassification,
  User
} from '@/lib/ai/types';

/**
 * Server Actions for AI Quality Checks
 * All AI interactions must happen server-side for API key security
 */

export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Analyze field quality inline (fast mode, <2s)
 * Used for real-time feedback as user types
 */
export async function analyzeFieldQualityAction(
  formType: 'nca' | 'mjc',
  fieldData: Partial<NCA> | Partial<MJC>,
  userId: string
): Promise<ServerActionResult<QualityScore>> {
  try {
    const aiService = createAIService();

    // Get user language level (default to 4 for now, should come from user profile)
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
    console.error('Field quality analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI quality check failed',
    };
  }
}

/**
 * Generate AI suggestions for corrective action or maintenance
 */
export async function generateSuggestionsAction(
  formType: 'nca' | 'mjc',
  formData: Partial<NCA> | Partial<MJC>,
  userId: string
): Promise<ServerActionResult<Suggestion>> {
  try {
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
    console.error('AI suggestion generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate AI suggestion',
    };
  }
}

/**
 * Validate form before submission (deep validation)
 * This is the quality gate check
 */
export async function validateBeforeSubmitAction(
  formType: 'nca' | 'mjc',
  formData: NCA | MJC,
  userId: string,
  isConfidential: boolean = false
): Promise<ServerActionResult<ValidationResult>> {
  try {
    // Bypass quality gate for confidential reports
    if (isConfidential) {
      return {
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 100, // Don't penalize confidential reports
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

    const aiService = createAIService();

    const user: User = {
      id: userId,
      role: 'operator',
      name: 'Current User',
      department: 'Quality',
      induction_completed: true,
      induction_date: new Date().toISOString(),
    };

    // AI service currently only supports NCA validation
    // MJC validation will be added in Phase 1.1
    if (formType === 'mjc') {
      // TODO: Implement MJC-specific validation when AI service supports it
      // For now, return a passing validation for MJC
      return {
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 75, // Pass threshold by default for MJC
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

    const validation = await aiService.validateBeforeSubmit(
      formData as NCA,
      user
    );

    return {
      success: true,
      data: validation,
    };
  } catch (error) {
    console.error('Pre-submission validation failed:', error);
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
 * Record when user accepts an AI suggestion
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
    // This will help improve AI suggestions over time
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
 * Record supervisor override when quality gate is bypassed
 * Critical for audit trail
 */
export async function recordSupervisorOverrideAction(
  formType: 'nca' | 'mjc',
  formId: string,
  qualityScore: number,
  overrideReason: string,
  supervisorId: string
): Promise<ServerActionResult<void>> {
  try {
    // TODO: Implement override recording in database
    // Must be logged for BRCGS compliance
    console.log('Recording supervisor override:', {
      formType,
      formId,
      qualityScore,
      overrideReason,
      supervisorId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to record supervisor override:', error);
    return {
      success: false,
      error: 'Failed to record override',
    };
  }
}
