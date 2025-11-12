import { useState, useCallback, useRef } from 'react';
import type { NCA, MJC, QualityScore, Suggestion, ValidationResult } from '@/lib/ai/types';
import {
  validateFieldQualityAction,
  getWritingAssistanceAction,
  validateSubmissionAction,
  recordSuggestionOutcomeAction,
} from '@/app/actions/quality-validation-actions';
import type { ActionResponse } from '@/app/actions/types';

/**
 * Unified hook for AI quality analysis and validation
 * Consolidates useAIQuality and useQualityValidation into single implementation
 * Manages state for inline quality checks, suggestions, and validation
 *
 * Uses quality-validation-actions which includes:
 * - Rule-based validation (fast, no AI needed for obvious issues)
 * - AI-powered deep validation
 * - Adaptive enforcement
 * - Multi-agent orchestration
 * - Enhanced RAG service
 */

export interface UseQualityAnalysisOptions {
  formType: 'nca' | 'mjc';
  userId: string;
  debounceMs?: number;
}

export interface UseQualityAnalysisReturn {
  // State
  qualityScore: QualityScore | null;
  suggestions: Suggestion | null;
  validationResult: ValidationResult | null;
  isChecking: boolean;
  isSuggesting: boolean;
  isValidating: boolean;
  error: string | null;

  // Actions (unified API supporting both naming conventions)
  checkQualityInline: (fieldData: Partial<NCA> | Partial<MJC>) => void;
  validateField: (fieldData: Partial<NCA> | Partial<MJC>) => void; // Alias for checkQualityInline

  generateSuggestion: (formData: Partial<NCA> | Partial<MJC>) => Promise<void>;
  getWritingHelp: (formData: Partial<NCA> | Partial<MJC>) => Promise<void>; // Alias for generateSuggestion

  validateBeforeSubmit: (
    formData: NCA | MJC,
    isConfidential?: boolean
  ) => Promise<ActionResponse<ValidationResult>>;
  validateSubmission: (
    formData: NCA | MJC,
    isConfidential?: boolean
  ) => Promise<ActionResponse<ValidationResult>>; // Alias for validateBeforeSubmit

  acceptSuggestion: (suggestion: Suggestion, fieldName: string, currentValue: string) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * useQualityAnalysis Hook
 *
 * Unified quality analysis hook that supports both inline validation and pre-submit checks.
 * Provides both old and new function names for backward compatibility during migration.
 *
 * @example
 * ```tsx
 * // New naming convention
 * const {
 *   qualityScore,
 *   isChecking,
 *   validateField,
 *   getWritingHelp,
 *   validateSubmission
 * } = useQualityAnalysis({
 *   formType: 'nca',
 *   userId: 'user-123',
 *   debounceMs: 3000
 * });
 *
 * // Old naming convention (still supported)
 * const {
 *   checkQualityInline,
 *   generateSuggestion,
 *   validateBeforeSubmit
 * } = useQualityAnalysis({
 *   formType: 'nca',
 *   userId: 'user-123'
 * });
 * ```
 */
export function useQualityAnalysis({
  formType,
  userId,
  debounceMs = 3000,
}: UseQualityAnalysisOptions): UseQualityAnalysisReturn {
  // State management
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for debouncing and request cancellation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check field quality inline (debounced)
   * Fires after user stops typing for `debounceMs`
   * Runs rule-based validation first, then AI analysis for deeper insights
   */
  const checkQualityInline = useCallback(
    (fieldData: Partial<NCA> | Partial<MJC>) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(async () => {
        setIsChecking(true);
        setError(null);

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
          const result = await validateFieldQualityAction(formType, fieldData, userId);

          if (!result.success) {
            setError(result.error || 'Validation failed');
            setQualityScore(null);
            return;
          }

          setQualityScore(result.data || null);
        } catch (err) {
          // Handle abort gracefully
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }

          console.error('Quality check error:', err);
          setError(err instanceof Error ? err.message : 'Validation failed');
          setQualityScore(null);
        } finally {
          setIsChecking(false);
        }
      }, debounceMs);
    },
    [formType, userId, debounceMs]
  );

  /**
   * Generate AI suggestion for a field
   * Not debounced - fires immediately when button clicked
   * Enhanced with Phase 7: User-Guided Generation and Enhanced RAG
   */
  const generateSuggestion = useCallback(
    async (formData: Partial<NCA> | Partial<MJC>) => {
      setIsSuggesting(true);
      setError(null);

      try {
        const result = await getWritingAssistanceAction(formType, formData, userId);

        if (!result.success) {
          setError(result.error || 'Failed to get writing assistance');
          setSuggestions(null);
          return;
        }

        setSuggestions(result.data || null);
      } catch (err) {
        console.error('Suggestion generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to get writing assistance');
        setSuggestions(null);
      } finally {
        setIsSuggesting(false);
      }
    },
    [formType, userId]
  );

  /**
   * Validate form before submission (quality gate)
   * Deep validation with rule-based checks first, then AI analysis
   * Applies adaptive enforcement based on attempt number
   */
  const validateBeforeSubmit = useCallback(
    async (
      formData: NCA | MJC,
      isConfidential: boolean = false
    ): Promise<ActionResponse<ValidationResult>> => {
      setIsValidating(true);
      setError(null);

      try {
        const result = await validateSubmissionAction(formType, formData, userId, isConfidential);

        if (!result.success) {
          setError(result.error || 'Validation failed');
          return result;
        }

        setValidationResult(result.data || null);
        return result;
      } catch (err) {
        console.error('Validation error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Validation failed';
        setError(errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsValidating(false);
      }
    },
    [formType, userId]
  );

  /**
   * Accept an AI suggestion and record the outcome
   * Used for learning and improvement
   */
  const acceptSuggestion = useCallback(
    (suggestion: Suggestion, fieldName: string, currentValue: string) => {
      // Record that suggestion was accepted
      recordSuggestionOutcomeAction(
        `suggestion-${Date.now()}`, // Generate temporary ID
        true, // accepted
        suggestion.text,
        currentValue, // Will be different if user edits after accepting
        userId
      ).catch((err) => {
        console.error('Failed to record suggestion outcome:', err);
      });

      // Clear suggestions after acceptance
      setSuggestions(null);
    },
    [userId]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all state and cancel pending operations
   */
  const reset = useCallback(() => {
    setQualityScore(null);
    setSuggestions(null);
    setValidationResult(null);
    setError(null);
    setIsChecking(false);
    setIsSuggesting(false);
    setIsValidating(false);

    // Clear timers and abort controllers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    // State
    qualityScore,
    suggestions,
    validationResult,
    isChecking,
    isSuggesting,
    isValidating,
    error,

    // Actions (with both naming conventions for backward compatibility)
    checkQualityInline,
    validateField: checkQualityInline, // Alias

    generateSuggestion,
    getWritingHelp: generateSuggestion, // Alias

    validateBeforeSubmit,
    validateSubmission: validateBeforeSubmit, // Alias

    acceptSuggestion,
    clearError,
    reset,
  };
}

// Re-export types for convenience
export type { QualityScore, Suggestion, ValidationResult } from '@/lib/ai/types';
export type { ActionResponse } from '@/app/actions/types';
