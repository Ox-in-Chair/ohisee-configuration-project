/**
 * NCA AI Integration Tests
 * TDD approach - tests written BEFORE implementation
 *
 * Test coverage:
 * - AI-enhanced textareas render correctly
 * - Inline quality checks trigger after typing
 * - Quality gate blocks submission when score < 75
 * - Quality gate allows submission when score >= 75
 * - Confidential reports bypass quality gate
 * - AI suggestions can be requested and applied
 * - Character counters work correctly
 * - Error handling for AI failures
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import NewNCAPage from '@/app/nca/new/page';
import * as aiActions from '@/app/actions/ai-quality-actions';

// Mock the AI actions
jest.mock('@/app/actions/ai-quality-actions');
jest.mock('@/app/actions/nca-actions');
jest.mock('@/app/actions/file-actions');

const mockAiActions = aiActions as jest.Mocked<typeof aiActions>;

describe('NCA AI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('AI-Enhanced Textareas', () => {
    it('should render AI-enhanced textarea for NC Description (Section 4)', () => {
      render(<NewNCAPage />);

      const textarea = screen.getByTestId('nc-description-ai');
      expect(textarea).toBeInTheDocument();

      const aiHelpButton = screen.getByTestId('nc-description-ai-ai-help');
      expect(aiHelpButton).toBeInTheDocument();
      expect(aiHelpButton).toHaveTextContent('Get AI Help');
    });

    it('should render AI-enhanced textarea for Root Cause Analysis (Section 9)', () => {
      render(<NewNCAPage />);

      const textarea = screen.getByTestId('root-cause-analysis-ai');
      expect(textarea).toBeInTheDocument();

      const aiHelpButton = screen.getByTestId('root-cause-analysis-ai-ai-help');
      expect(aiHelpButton).toBeInTheDocument();
    });

    it('should render AI-enhanced textarea for Corrective Action (Section 10)', () => {
      render(<NewNCAPage />);

      const textarea = screen.getByTestId('corrective-action-ai');
      expect(textarea).toBeInTheDocument();

      const aiHelpButton = screen.getByTestId('corrective-action-ai-ai-help');
      expect(aiHelpButton).toBeInTheDocument();
    });

    it('should display character counter for AI-enhanced fields', () => {
      render(<NewNCAPage />);

      const charCount = screen.getByTestId('nc-description-ai-char-count');
      expect(charCount).toBeInTheDocument();
      expect(charCount).toHaveTextContent('0 / 100 minimum');
    });
  });

  describe('Inline Quality Checks', () => {
    it('should trigger quality check after user stops typing for 3 seconds', async () => {
      mockAiActions.analyzeFieldQualityAction.mockResolvedValue({
        success: true,
        data: {
          score: 85,
          threshold_met: true,
          breakdown: {
            completeness: 26,
            accuracy: 22,
            clarity: 18,
            hazard_identification: 12,
            evidence: 7,
          },
        },
      });

      render(<NewNCAPage />);

      const textarea = screen.getByTestId('nc-description-ai');

      // User types description
      await userEvent.type(
        textarea,
        'Foreign material (plastic) found in batch #12345. Detected during visual inspection at 10:00 AM. Approximately 50 units affected.'
      );

      // Fast-forward 3 seconds (debounce timer)
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Quality check should be triggered
      await waitFor(() => {
        expect(mockAiActions.analyzeFieldQualityAction).toHaveBeenCalledWith(
          'nca',
          expect.objectContaining({
            nc_description: expect.stringContaining('Foreign material'),
          }),
          expect.any(String) // userId
        );
      });
    });

    it('should display quality score badge after check completes', async () => {
      mockAiActions.analyzeFieldQualityAction.mockResolvedValue({
        success: true,
        data: {
          score: 82,
          threshold_met: true,
          breakdown: {
            completeness: 25,
            accuracy: 20,
            clarity: 17,
            hazard_identification: 13,
            evidence: 7,
          },
        },
      });

      render(<NewNCAPage />);

      const textarea = screen.getByTestId('nc-description-ai');

      await userEvent.type(
        textarea,
        'Contamination detected in production line. Quality team isolated affected product immediately.'
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        const badge = screen.getByTestId('quality-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('data-score', '82');
      });
    });

    it('should show loading state during quality check', async () => {
      // Delay the response to see loading state
      mockAiActions.analyzeFieldQualityAction.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: {
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
                }),
              1000
            )
          )
      );

      render(<NewNCAPage />);

      const textarea = screen.getByTestId('nc-description-ai');

      await userEvent.type(textarea, 'Test description for quality check');

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should show loading badge
      await waitFor(() => {
        const loadingBadge = screen.getByTestId('quality-badge-loading');
        expect(loadingBadge).toBeInTheDocument();
        expect(loadingBadge).toHaveTextContent('Checking quality...');
      });

      // Advance timers to complete the check
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should show quality score
      await waitFor(() => {
        const badge = screen.getByTestId('quality-badge');
        expect(badge).toHaveAttribute('data-score', '75');
      });
    });

    it('should handle quality check errors gracefully', async () => {
      mockAiActions.analyzeFieldQualityAction.mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable',
      });

      render(<NewNCAPage />);

      const textarea = screen.getByTestId('nc-description-ai');

      await userEvent.type(textarea, 'Test description');

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockAiActions.analyzeFieldQualityAction).toHaveBeenCalled();
      });

      // Should not crash, should allow user to continue
      expect(textarea).toBeEnabled();
    });
  });

  describe('AI Suggestions', () => {
    it('should generate AI suggestions when "Get AI Help" button clicked', async () => {
      mockAiActions.generateSuggestionsAction.mockResolvedValue({
        success: true,
        data: {
          text: 'Consider adding more specific details about the contamination type, location, and immediate actions taken.',
          quality_score: 85,
          confidence: 'high',
          confidence_percentage: 92,
          sections: ['nc_description'],
          procedure_references: ['BRCGS-3.3.1', 'SOP-QA-001'],
          keywords_detected: ['contamination', 'foreign material'],
          recommendations: [
            'Specify the type of contamination',
            'Include batch numbers',
            'Document immediate corrective actions',
          ],
        },
      });

      render(<NewNCAPage />);

      const aiHelpButton = screen.getByTestId('nc-description-ai-ai-help');

      fireEvent.click(aiHelpButton);

      await waitFor(() => {
        expect(mockAiActions.generateSuggestionsAction).toHaveBeenCalledWith(
          'nca',
          expect.any(Object),
          expect.any(String)
        );
      });
    });

    it('should show suggestion modal with AI-generated content', async () => {
      mockAiActions.generateSuggestionsAction.mockResolvedValue({
        success: true,
        data: {
          text: 'Recommended corrective action: Implement additional screening process at inspection point.',
          quality_score: 88,
          confidence: 'high',
          confidence_percentage: 95,
          sections: ['corrective_action'],
          procedure_references: ['BRCGS-3.4.2'],
          keywords_detected: ['screening', 'inspection'],
          recommendations: ['Add preventive measures', 'Train operators'],
        },
      });

      render(<NewNCAPage />);

      const aiHelpButton = screen.getByTestId('corrective-action-ai-ai-help');

      fireEvent.click(aiHelpButton);

      await waitFor(() => {
        const modal = screen.getByTestId('ai-assistant-modal');
        expect(modal).toBeInTheDocument();
      });

      // Should display suggestion text
      expect(screen.getByText(/Implement additional screening process/i)).toBeInTheDocument();
    });

    it('should allow user to accept AI suggestion', async () => {
      mockAiActions.generateSuggestionsAction.mockResolvedValue({
        success: true,
        data: {
          text: 'Root cause: Inadequate visual inspection at receiving stage.',
          quality_score: 80,
          confidence: 'medium',
          confidence_percentage: 78,
          sections: ['root_cause_analysis'],
          procedure_references: [],
          keywords_detected: ['visual inspection'],
          recommendations: ['Enhance inspection protocol'],
        },
      });

      render(<NewNCAPage />);

      const aiHelpButton = screen.getByTestId('root-cause-analysis-ai-ai-help');

      fireEvent.click(aiHelpButton);

      await waitFor(() => {
        const acceptButton = screen.getByTestId('ai-suggestion-accept');
        expect(acceptButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('ai-suggestion-accept'));

      // Suggestion should be applied to textarea
      const textarea = screen.getByTestId('root-cause-analysis-ai');
      expect(textarea).toHaveValue('Root cause: Inadequate visual inspection at receiving stage.');
    });

    it('should allow user to reject AI suggestion', async () => {
      mockAiActions.generateSuggestionsAction.mockResolvedValue({
        success: true,
        data: {
          text: 'Suggested text',
          quality_score: 75,
          confidence: 'low',
          confidence_percentage: 65,
          sections: ['nc_description'],
          procedure_references: [],
          keywords_detected: [],
          recommendations: [],
        },
      });

      render(<NewNCAPage />);

      const aiHelpButton = screen.getByTestId('nc-description-ai-ai-help');

      fireEvent.click(aiHelpButton);

      await waitFor(() => {
        const rejectButton = screen.getByTestId('ai-suggestion-reject');
        expect(rejectButton).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('ai-suggestion-reject'));

      // Modal should close, textarea should remain unchanged
      await waitFor(() => {
        expect(screen.queryByTestId('ai-assistant-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quality Gate (Pre-Submission Validation)', () => {
    it('should block submission when quality score < 75', async () => {
      // Mock inline quality check returning low score
      mockAiActions.analyzeFieldQualityAction.mockResolvedValue({
        success: true,
        data: {
          score: 62,
          threshold_met: false,
          breakdown: {
            completeness: 18,
            accuracy: 15,
            clarity: 12,
            hazard_identification: 10,
            evidence: 7,
          },
        },
      });

      // Mock deep validation returning low score
      mockAiActions.validateBeforeSubmitAction.mockResolvedValue({
        success: true,
        data: {
          valid: false,
          ready_for_submission: false,
          quality_assessment: {
            score: 62,
            threshold_met: false,
            breakdown: {
              completeness: 18,
              accuracy: 15,
              clarity: 12,
              hazard_identification: 10,
              evidence: 7,
            },
          },
          errors: [],
          warnings: [
            {
              field: 'nc_description',
              message: 'Description lacks specific details',
              suggestion: 'Include times, measurements, and affected quantities',
            },
          ],
        },
      });

      render(<NewNCAPage />);

      // Fill required fields
      const ncTypeRadio = screen.getByTestId('nc-type-finished-goods');
      fireEvent.click(ncTypeRadio);

      const productDesc = screen.getByTestId('nc-product-description');
      await userEvent.type(productDesc, 'Test Product');

      const ncDescription = screen.getByTestId('nc-description-ai');
      await userEvent.type(ncDescription, 'Brief description lacking details.');

      const machineStatus = screen.getByTestId('machine-status-operational');
      fireEvent.click(machineStatus);

      // Try to submit
      const submitButton = screen.getByTestId('btn-submit');
      fireEvent.click(submitButton);

      // Should show quality gate modal
      await waitFor(() => {
        const modal = screen.getByTestId('quality-gate-modal');
        expect(modal).toBeInTheDocument();
      });

      // Should show score breakdown
      expect(screen.getByText(/Quality Score: 62\/100/i)).toBeInTheDocument();
      expect(screen.getByText(/Below required threshold/i)).toBeInTheDocument();

      // Should show suggestions
      expect(screen.getByText(/Include times, measurements/i)).toBeInTheDocument();

      // "Submit Anyway" should require supervisor override
      const submitAnywayButton = screen.getByTestId('quality-gate-submit-anyway');
      expect(submitAnywayButton).toBeInTheDocument();
      expect(submitAnywayButton).toHaveTextContent(/Supervisor Override Required/i);
    });

    it('should allow submission when quality score >= 75', async () => {
      mockAiActions.validateBeforeSubmitAction.mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 85,
            threshold_met: true,
            breakdown: {
              completeness: 26,
              accuracy: 22,
              clarity: 18,
              hazard_identification: 12,
              evidence: 7,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<NewNCAPage />);

      // Fill required fields
      const ncTypeRadio = screen.getByTestId('nc-type-finished-goods');
      fireEvent.click(ncTypeRadio);

      const productDesc = screen.getByTestId('nc-product-description');
      await userEvent.type(productDesc, 'Chocolate Bar 100g');

      const ncDescription = screen.getByTestId('nc-description-ai');
      await userEvent.type(
        ncDescription,
        'Foreign material (plastic fragment approximately 2mm) detected in Batch #ABC123 during final inspection at 14:30. Product immediately isolated and quarantined. Approximately 500 units affected.'
      );

      const machineStatus = screen.getByTestId('machine-status-operational');
      fireEvent.click(machineStatus);

      // Submit should proceed without quality gate modal
      const submitButton = screen.getByTestId('btn-submit');
      fireEvent.click(submitButton);

      // Should NOT show quality gate modal
      await waitFor(() => {
        expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
      });

      // Validation should have been called
      expect(mockAiActions.validateBeforeSubmitAction).toHaveBeenCalled();
    });

    it('should bypass quality gate for confidential reports', async () => {
      mockAiActions.validateBeforeSubmitAction.mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 100, // Bypassed
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
          warnings: [
            {
              field: 'confidential_report',
              message: 'Confidential report - quality gate bypassed per BRCGS Section 1.1.3',
              suggestion: 'Quality feedback provided for educational purposes only',
            },
          ],
        },
      });

      render(<NewNCAPage />);

      // Check confidential checkbox (need to add this to form)
      const confidentialCheckbox = screen.getByTestId('confidential-report');
      fireEvent.click(confidentialCheckbox);

      // Fill minimal fields
      const ncTypeRadio = screen.getByTestId('nc-type-incident');
      fireEvent.click(ncTypeRadio);

      const productDesc = screen.getByTestId('nc-product-description');
      await userEvent.type(productDesc, 'Confidential Report');

      const ncDescription = screen.getByTestId('nc-description-ai');
      await userEvent.type(ncDescription, 'Brief confidential description.');

      const machineStatus = screen.getByTestId('machine-status-operational');
      fireEvent.click(machineStatus);

      const submitButton = screen.getByTestId('btn-submit');
      fireEvent.click(submitButton);

      // Should bypass quality gate
      await waitFor(() => {
        expect(mockAiActions.validateBeforeSubmitAction).toHaveBeenCalledWith(
          'nca',
          expect.any(Object),
          expect.any(String),
          true // isConfidential
        );
      });

      // Should NOT show quality gate modal
      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service failures gracefully', async () => {
      mockAiActions.analyzeFieldQualityAction.mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      render(<NewNCAPage />);

      const textarea = screen.getByTestId('nc-description-ai');

      await userEvent.type(textarea, 'Test description');

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockAiActions.analyzeFieldQualityAction).toHaveBeenCalled();
      });

      // Should not prevent user from continuing
      expect(textarea).toBeEnabled();

      // Submit button should still be available
      const submitButton = screen.getByTestId('btn-submit');
      expect(submitButton).toBeEnabled();
    });

    it('should allow submission if validation service fails', async () => {
      mockAiActions.validateBeforeSubmitAction.mockResolvedValue({
        success: false,
        error: 'Validation service temporarily unavailable',
      });

      render(<NewNCAPage />);

      // Fill form
      const ncTypeRadio = screen.getByTestId('nc-type-finished-goods');
      fireEvent.click(ncTypeRadio);

      const productDesc = screen.getByTestId('nc-product-description');
      await userEvent.type(productDesc, 'Test Product');

      const ncDescription = screen.getByTestId('nc-description-ai');
      await userEvent.type(ncDescription, 'Test description with sufficient length to meet minimum requirements.');

      const machineStatus = screen.getByTestId('machine-status-operational');
      fireEvent.click(machineStatus);

      const submitButton = screen.getByTestId('btn-submit');
      fireEvent.click(submitButton);

      // Should show warning but allow submission
      await waitFor(() => {
        const warning = screen.getByText(/AI validation temporarily unavailable/i);
        expect(warning).toBeInTheDocument();
      });

      const proceedButton = screen.getByTestId('quality-gate-proceed-anyway');
      expect(proceedButton).toBeInTheDocument();
    });
  });
});
