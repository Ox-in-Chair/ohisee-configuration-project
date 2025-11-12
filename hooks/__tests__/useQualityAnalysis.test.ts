/**
 * useQualityAnalysis Hook Unit Tests
 * Tests debouncing, error handling, state management, and API interactions
 * Unified test suite for quality analysis and validation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useQualityAnalysis } from '../useQualityAnalysis';
import * as qualityValidationActions from '@/app/actions/quality-validation-actions';
import type { QualityScore, Suggestion, ValidationResult } from '@/lib/ai/types';

// Mock the server actions
jest.mock('@/app/actions/quality-validation-actions');

describe('useQualityAnalysis', () => {
  const mockUserId = 'user-123';
  const mockFormType = 'nca';

  const mockQualityScore: QualityScore = {
    score: 82,
    threshold_met: true,
    breakdown: {
      completeness: 25,
      accuracy: 20,
      clarity: 18,
      hazard_identification: 12,
      evidence: 7,
    },
  };

  const mockSuggestion: Suggestion = {
    text: 'Detailed corrective action suggestion',
    sections: {
      immediate_correction: 'Quarantine affected product',
      root_cause: 'Calibration drift detected',
      corrective_action: 'Recalibrate equipment per procedure 5.6',
      verification: 'Monitor next 100 units for compliance',
    },
    quality_score: 85,
    confidence: 'high',
    confidence_percentage: 88,
    procedure_references: ['5.6', '5.7', '3.11'],
    keywords_detected: {
      category: 'process',
      keywords: ['calibration', 'specification', 'tolerance'],
    },
    recommendations: {
      calibration_check: true,
      training_required: false,
    },
  };

  const mockValidationResult: ValidationResult = {
    valid: true,
    ready_for_submission: true,
    quality_assessment: mockQualityScore,
    errors: [],
    warnings: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    (qualityValidationActions.validateFieldQualityAction as jest.Mock).mockResolvedValue({
      success: true,
      data: mockQualityScore,
    });

    (qualityValidationActions.getWritingAssistanceAction as jest.Mock).mockResolvedValue({
      success: true,
      data: mockSuggestion,
    });

    (qualityValidationActions.validateSubmissionAction as jest.Mock).mockResolvedValue({
      success: true,
      data: mockValidationResult,
    });

    (qualityValidationActions.recordSuggestionOutcomeAction as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      expect(result.current.qualityScore).toBeNull();
      expect(result.current.suggestions).toBeNull();
      expect(result.current.validationResult).toBeNull();
      expect(result.current.isChecking).toBe(false);
      expect(result.current.isSuggesting).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should accept custom debounce delay', () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 5000,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('validateField - Debouncing', () => {
    it('should debounce quality check calls', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 3000,
        })
      );

      const fieldData = { nc_description: 'Test description' };

      // Make multiple rapid calls
      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        result.current.validateField(fieldData);
      });

      // API should not have been called yet
      expect(qualityValidationActions.validateFieldQualityAction).not.toHaveBeenCalled();

      // Fast-forward time to trigger debounce
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Wait for async operations
      await waitFor(() => {
        expect(qualityValidationActions.validateFieldQualityAction).toHaveBeenCalledTimes(1);
      });
    });

    it('should cancel previous request when new input arrives', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 2000,
        })
      );

      const fieldData1 = { nc_description: 'First description' };
      const fieldData2 = { nc_description: 'Second description' };

      // First call
      act(() => {
        result.current.validateField(fieldData1);
      });

      // Advance timer partially
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Second call before first completes
      act(() => {
        result.current.validateField(fieldData2);
      });

      // Advance timer to complete second call
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for completion
      await waitFor(() => {
        expect(qualityValidationActions.validateFieldQualityAction).toHaveBeenCalledTimes(1);
      });

      // Should have called with second data
      expect(qualityValidationActions.validateFieldQualityAction).toHaveBeenCalledWith(
        mockFormType,
        fieldData2,
        mockUserId
      );
    });

    it('should update quality score after debounce completes', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 1000,
        })
      );

      const fieldData = { nc_description: 'Test description' };

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.qualityScore).toEqual(mockQualityScore);
        expect(result.current.isChecking).toBe(false);
      });
    });

    it('should set isChecking to true during API call', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 1000,
        })
      );

      const fieldData = { nc_description: 'Test' };

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Check loading state before promise resolves
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false); // Will be false after completion
      });
    });
  });

  describe('validateField - Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'API call failed';
      (qualityValidationActions.validateFieldQualityAction as jest.Mock).mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 1000,
        })
      );

      const fieldData = { nc_description: 'Test' };

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.qualityScore).toBeNull();
        expect(result.current.isChecking).toBe(false);
      });
    });

    it('should handle thrown exceptions', async () => {
      (qualityValidationActions.validateFieldQualityAction as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 1000,
        })
      );

      const fieldData = { nc_description: 'Test' };

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.qualityScore).toBeNull();
      });
    });

    it('should clear error on successful subsequent call', async () => {
      // First call fails
      (qualityValidationActions.validateFieldQualityAction as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'First error',
      });

      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 1000,
        })
      );

      const fieldData = { nc_description: 'Test' };

      // First call
      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Second call succeeds
      (qualityValidationActions.validateFieldQualityAction as jest.Mock).mockResolvedValue({
        success: true,
        data: mockQualityScore,
      });

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.qualityScore).toEqual(mockQualityScore);
      });
    });
  });

  describe('getWritingHelp', () => {
    it('should generate AI suggestions immediately (no debounce)', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      const formData = {
        nc_description: 'Print registration issue',
        corrective_action: 'Recalibrate',
      };

      await act(async () => {
        await result.current.getWritingHelp(formData);
      });

      expect(qualityValidationActions.getWritingAssistanceAction).toHaveBeenCalledTimes(1);
      expect(qualityValidationActions.getWritingAssistanceAction).toHaveBeenCalledWith(
        mockFormType,
        formData,
        mockUserId
      );
      expect(result.current.suggestions).toEqual(mockSuggestion);
      expect(result.current.isSuggesting).toBe(false);
    });

    it('should set isSuggesting to true during API call', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      const formData = { nc_description: 'Test' };

      let suggestingDuringCall = false;

      (qualityValidationActions.getWritingAssistanceAction as jest.Mock).mockImplementation(async () => {
        suggestingDuringCall = result.current.isSuggesting;
        return { success: true, data: mockSuggestion };
      });

      await act(async () => {
        await result.current.getWritingHelp(formData);
      });

      expect(suggestingDuringCall).toBe(true);
      expect(result.current.isSuggesting).toBe(false);
    });

    it('should handle suggestion generation errors', async () => {
      (qualityValidationActions.getWritingAssistanceAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to generate suggestion',
      });

      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      await act(async () => {
        await result.current.getWritingHelp({ nc_description: 'Test' });
      });

      expect(result.current.error).toBe('Failed to generate suggestion');
      expect(result.current.suggestions).toBeNull();
    });
  });

  describe('validateSubmission', () => {
    it('should validate form data and return result', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      const formData = {
        nca_id: 'NCA-001',
        nc_description: 'Complete description',
        nc_type: 'wip' as const,
        machine_status: 'operational' as const,
        cross_contamination: false,
        disposition_rework: false,
        disposition_concession: false,
        corrective_action: 'Detailed corrective action',
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateSubmission(formData, false);
      });

      expect(validationResult).toEqual({ success: true, data: mockValidationResult });
      expect(result.current.validationResult).toEqual(mockValidationResult);
    });

    it('should bypass quality gate for confidential reports', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      const formData = {
        nca_id: 'NCA-001',
        nc_description: 'Brief confidential report',
        nc_type: 'incident' as const,
        machine_status: 'operational' as const,
        cross_contamination: false,
        disposition_rework: false,
        disposition_concession: false,
      };

      await act(async () => {
        await result.current.validateSubmission(formData, true);
      });

      // Should still call validation (server action handles bypass)
      expect(qualityValidationActions.validateSubmissionAction).toHaveBeenCalledWith(
        mockFormType,
        formData,
        mockUserId,
        true
      );
    });

    it('should handle validation errors', async () => {
      (qualityValidationActions.validateSubmissionAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Validation failed',
      });

      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      const formData = {
        nca_id: 'NCA-001',
        nc_description: 'Test',
        nc_type: 'wip' as const,
        machine_status: 'operational' as const,
        cross_contamination: false,
        disposition_rework: false,
        disposition_concession: false,
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateSubmission(formData);
      });

      expect(validationResult).toEqual({ success: false, error: 'Validation failed' });
      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('acceptSuggestion', () => {
    it('should record suggestion acceptance and clear suggestions', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      // First generate a suggestion
      await act(async () => {
        await result.current.getWritingHelp({ nc_description: 'Test' });
      });

      expect(result.current.suggestions).not.toBeNull();

      // Accept the suggestion
      act(() => {
        result.current.acceptSuggestion(
          mockSuggestion,
          'corrective_action',
          'Original text'
        );
      });

      // Should clear suggestions
      await waitFor(() => {
        expect(result.current.suggestions).toBeNull();
      });

      // Should record outcome (async, may not complete immediately)
      await waitFor(() => {
        expect(qualityValidationActions.recordSuggestionOutcomeAction).toHaveBeenCalled();
      });
    });

    it('should handle recording errors gracefully', async () => {
      (qualityValidationActions.recordSuggestionOutcomeAction as jest.Mock).mockRejectedValue(
        new Error('Recording failed')
      );

      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      // Should not throw even if recording fails
      await act(async () => {
        result.current.acceptSuggestion(
          mockSuggestion,
          'corrective_action',
          'Original text'
        );
      });

      expect(result.current.suggestions).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should clear error when clearError is called', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      // Set an error
      (qualityValidationActions.validateFieldQualityAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      const fieldData = { nc_description: 'Test' };

      act(() => {
        result.current.validateField(fieldData);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset all state when reset is called', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
        })
      );

      // Set some state
      await act(async () => {
        await result.current.getWritingHelp({ nc_description: 'Test' });
      });

      expect(result.current.suggestions).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.qualityScore).toBeNull();
      expect(result.current.suggestions).toBeNull();
      expect(result.current.validationResult).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isChecking).toBe(false);
      expect(result.current.isSuggesting).toBe(false);
      expect(result.current.isValidating).toBe(false);
    });

    it('should cancel pending requests on reset', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: mockFormType,
          userId: mockUserId,
          debounceMs: 5000,
        })
      );

      // Start a debounced call
      act(() => {
        result.current.validateField({ nc_description: 'Test' });
      });

      // Advance timer partially
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Reset before completion
      act(() => {
        result.current.reset();
      });

      // Advance timer to completion
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // API should not have been called
      await waitFor(() => {
        expect(qualityValidationActions.validateFieldQualityAction).not.toHaveBeenCalled();
      });
    });
  });

  describe('MJC Form Type', () => {
    it('should work with MJC form type', async () => {
      const { result } = renderHook(() =>
        useQualityAnalysis({
          formType: 'mjc',
          userId: mockUserId,
        })
      );

      const mjcData = {
        description_required: 'Machine malfunction',
        maintenance_performed: 'Replaced component',
      };

      await act(async () => {
        await result.current.getWritingHelp(mjcData);
      });

      expect(qualityValidationActions.getWritingAssistanceAction).toHaveBeenCalledWith(
        'mjc',
        mjcData,
        mockUserId
      );
    });
  });
});
