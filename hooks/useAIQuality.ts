import { useState, useCallback, useRef } from 'react';
import type { NCA, MJC, QualityScore, Suggestion, ValidationResult } from '@/lib/ai/types';
import {
  analyzeFieldQualityAction,
  generateSuggestionsAction,
  validateBeforeSubmitAction,
  recordSuggestionOutcomeAction,
  type ServerActionResult,
} from '@/app/actions/ai-quality-actions';

/**
 * Hook for AI quality analysis and suggestions
 * Manages state for inline quality checks, suggestions, and validation
 */

export interface UseAIQualityOptions {
  formType: 'nca' | 'mjc';
  userId: string;
  debounceMs?: number;
}

export interface UseAIQualityReturn {
  // State
  qualityScore: QualityScore | null;
  suggestions: Suggestion | null;
  validationResult: ValidationResult | null;
  isChecking: boolean;
  isSuggesting: boolean;
  isValidating: boolean;
  error: string | null;

  // Actions
  checkQualityInline: (fieldData: Partial<NCA> | Partial<MJC>) => void;
  generateSuggestion: (formData: Partial<NCA> | Partial<MJC>) => Promise<void>;
  validateBeforeSubmit: (
    formData: NCA | MJC,
    isConfidential?: boolean
  ) => Promise<ServerActionResult<ValidationResult>>;
  acceptSuggestion: (suggestion: Suggestion, fieldName: string, currentValue: string) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * useAIQuality Hook
 *
 * @example
 * ```tsx
 * const {
 *   qualityScore,
 *   isChecking,
 *   checkQualityInline,
 *   generateSuggestion
 * } = useAIQuality({
 *   formType: 'nca',
 *   userId: 'user-123',
 *   debounceMs: 3000
 * });
 * ```
 */
export function useAIQuality({
  formType,
  userId,
  debounceMs = 3000,
}: UseAIQualityOptions): UseAIQualityReturn {
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
   * Check field quality inline (debounced)
   * Fires after user stops typing for `debounceMs`
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
          const result = await analyzeFieldQualityAction(formType, fieldData, userId);

          if (!result.success) {
            setError(result.error || 'Quality check failed');
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
          setError(err instanceof Error ? err.message : 'Quality check failed');
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
   */
  const generateSuggestion = useCallback(
    async (formData: Partial<NCA> | Partial<MJC>) => {
      setIsSuggesting(true);
      setError(null);

      try {
        const result = await generateSuggestionsAction(formType, formData, userId);

        if (!result.success) {
          setError(result.error || 'Failed to generate suggestion');
          setSuggestions(null);
          return;
        }

        setSuggestions(result.data || null);
      } catch (err) {
        console.error('Suggestion generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate suggestion');
        setSuggestions(null);
      } finally {
        setIsSuggesting(false);
      }
    },
    [formType, userId]
  );

  /**
   * Validate form before submission (quality gate)
   * Deep validation that may show quality gate modal
   */
  const validateBeforeSubmit = useCallback(
    async (
      formData: NCA | MJC,
      isConfidential: boolean = false
    ): Promise<ServerActionResult<ValidationResult>> => {
      setIsValidating(true);
      setError(null);

      try {
        const result = await validateBeforeSubmitAction(formType, formData, userId, isConfidential);

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
    checkQualityInline,
    generateSuggestion,
    validateBeforeSubmit,
    acceptSuggestion,
    clearError,
    reset,
  };
}
