import { useState, useCallback, useRef } from 'react';
import type { NCA, MJC, QualityScore, Suggestion, ValidationResult } from '@/lib/ai/types';
import {
  validateFieldQualityAction,
  getWritingAssistanceAction,
  validateSubmissionAction,
  recordSuggestionOutcomeAction,
  type ServerActionResult,
  // Backward compatibility exports
  analyzeFieldQualityAction,
  generateSuggestionsAction,
  validateBeforeSubmitAction,
} from '@/app/actions/quality-validation-actions';

/**
 * Hook for quality validation and writing assistance
 * Manages state for inline validation, suggestions, and submission validation
 */

export interface UseQualityValidationOptions {
  formType: 'nca' | 'mjc';
  userId: string;
  debounceMs?: number;
}

export interface UseQualityValidationReturn {
  // State
  qualityScore: QualityScore | null;
  suggestions: Suggestion | null;
  validationResult: ValidationResult | null;
  isChecking: boolean;
  isSuggesting: boolean;
  isValidating: boolean;
  error: string | null;

  // Actions
  validateField: (fieldData: Partial<NCA> | Partial<MJC>) => void;
  getWritingHelp: (formData: Partial<NCA> | Partial<MJC>) => Promise<void>;
  validateSubmission: (
    formData: NCA | MJC,
    isConfidential?: boolean
  ) => Promise<ServerActionResult<ValidationResult>>;
  acceptSuggestion: (suggestion: Suggestion, fieldName: string, currentValue: string) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * useQualityValidation Hook
 *
 * @example
 * ```tsx
 * const {
 *   qualityScore,
 *   isChecking,
 *   validateField,
 *   getWritingHelp
 * } = useQualityValidation({
 *   formType: 'nca',
 *   userId: 'user-123',
 *   debounceMs: 3000
 * });
 * ```
 */
export function useQualityValidation({
  formType,
  userId,
  debounceMs = 3000,
}: UseQualityValidationOptions): UseQualityValidationReturn {
  // State
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for debouncing and cancellation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Validate field inline (debounced)
   * Fires after user stops typing for `debounceMs`
   */
  const validateField = useCallback(
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

          console.error('Validation error:', err);
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
   * Get writing assistance for a field
   * Not debounced - fires immediately when button clicked
   */
  const getWritingHelp = useCallback(
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
        console.error('Writing assistance error:', err);
        setError(err instanceof Error ? err.message : 'Failed to get writing assistance');
        setSuggestions(null);
      } finally {
        setIsSuggesting(false);
      }
    },
    [formType, userId]
  );

  /**
   * Validate form before submission (validation gate)
   * Deep validation that may show validation modal
   */
  const validateSubmission = useCallback(
    async (
      formData: NCA | MJC,
      isConfidential: boolean = false
    ): Promise<ServerActionResult<ValidationResult>> => {
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
   * Accept a writing suggestion and record the outcome
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
   * Reset all state
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

    // Actions
    validateField,
    getWritingHelp,
    validateSubmission,
    acceptSuggestion,
    clearError,
    reset,
  };
}

