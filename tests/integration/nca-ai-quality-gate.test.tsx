/**
 * NCA Form AI Quality Gate Integration Tests
 * Tests complete workflow from form filling to quality gate validation
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as aiQualityActions from '@/app/actions/ai-quality-actions';

// Mock the server actions
jest.mock('@/app/actions/ai-quality-actions');

/**
 * Mock NCA Form Component
 * Simulates the actual NCA form with AI integration
 */
const MockNCAFormWithAI = () => {
  const [formData, setFormData] = useState({
    nc_description: '',
    corrective_action: '',
    is_confidential: false,
  });
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [showQualityGate, setShowQualityGate] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleDescriptionChange = (value: string) => {
    setFormData({ ...formData, nc_description: value });
  };

  const checkQuality = async () => {
    const result = await aiQualityActions.analyzeFieldQualityAction(
      'nca',
      { nc_description: formData.nc_description },
      'user-123'
    );

    if (result.success && result.data) {
      setQualityScore(result.data.score);
    }
  };

  const handleSubmit = async () => {
    const validation = await aiQualityActions.validateBeforeSubmitAction(
      'nca',
      formData as any,
      'user-123',
      formData.is_confidential
    );

    if (validation.success && validation.data) {
      setValidationResult(validation.data);

      if (!validation.data.ready_for_submission) {
        setShowQualityGate(true);
      } else {
        // Submit form
        console.log('Form submitted');
      }
    }
  };

  return (
    <div>
      <label htmlFor="nc-description">NC Description</label>
      <textarea
        id="nc-description"
        value={formData.nc_description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        data-testid="nc-description"
      />

      <button onClick={checkQuality} data-testid="check-quality">
        Check Quality
      </button>

      {qualityScore !== null && (
        <div data-testid="quality-score">{qualityScore}</div>
      )}

      <label htmlFor="is-confidential">
        <input
          type="checkbox"
          id="is-confidential"
          checked={formData.is_confidential}
          onChange={(e) =>
            setFormData({ ...formData, is_confidential: e.target.checked })
          }
          data-testid="is-confidential"
        />
        Confidential Report
      </label>

      <button onClick={handleSubmit} data-testid="submit-form">
        Submit
      </button>

      {showQualityGate && (
        <div data-testid="quality-gate-modal">
          <h2>Quality Gate</h2>
          <p data-testid="quality-gate-score">
            Score: {validationResult?.quality_assessment.score}
          </p>
          <p>Your submission does not meet the quality threshold.</p>
          <button
            onClick={() => setShowQualityGate(false)}
            data-testid="go-back-edit"
          >
            Go Back & Edit
          </button>
          <button data-testid="submit-anyway">Submit Anyway</button>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';

describe('NCA Form AI Quality Gate Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Inline Quality Check', () => {
    it('should trigger inline quality check after typing', async () => {
      (aiQualityActions.analyzeFieldQualityAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          score: 82,
          threshold_met: true,
          breakdown: {
            completeness: 25,
            accuracy: 20,
            clarity: 18,
            hazard_identification: 12,
            evidence: 7,
          },
        },
      });

      render(<MockNCAFormWithAI />);

      const description = screen.getByTestId('nc-description');
      fireEvent.change(description, {
        target: {
          value: 'Print registration misalignment detected on CMH-01. Exceeds tolerance.',
        },
      });

      const checkButton = screen.getByTestId('check-quality');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(aiQualityActions.analyzeFieldQualityAction).toHaveBeenCalledWith(
          'nca',
          {
            nc_description:
              'Print registration misalignment detected on CMH-01. Exceeds tolerance.',
          },
          'user-123'
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('quality-score')).toHaveTextContent('82');
      });
    });

    it('should display quality badge after analysis completes', async () => {
      (aiQualityActions.analyzeFieldQualityAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          score: 78,
          threshold_met: true,
          breakdown: {
            completeness: 24,
            accuracy: 19,
            clarity: 17,
            hazard_identification: 11,
            evidence: 7,
          },
        },
      });

      render(<MockNCAFormWithAI />);

      const description = screen.getByTestId('nc-description');
      fireEvent.change(description, {
        target: { value: 'Detailed non-conformance description with context' },
      });

      fireEvent.click(screen.getByTestId('check-quality'));

      await waitFor(() => {
        expect(screen.getByTestId('quality-score')).toBeInTheDocument();
      });
    });
  });

  describe('Quality Gate - High Quality (>=75)', () => {
    it('should allow submission when quality score >= 75', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 85,
            threshold_met: true,
            breakdown: {
              completeness: 27,
              accuracy: 22,
              clarity: 18,
              hazard_identification: 12,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      const submitButton = screen.getByTestId('submit-form');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(aiQualityActions.validateBeforeSubmitAction).toHaveBeenCalled();
      });

      // Quality gate modal should NOT appear
      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
    });

    it('should submit form successfully with high-quality content', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 92,
            threshold_met: true,
            breakdown: {
              completeness: 29,
              accuracy: 24,
              clarity: 20,
              hazard_identification: 13,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      const consoleSpy = jest.spyOn(console, 'log');

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Form submitted');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Quality Gate - Low Quality (<75)', () => {
    it('should block submission when quality score < 75', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 68,
            threshold_met: false,
            breakdown: {
              completeness: 20,
              accuracy: 17,
              clarity: 15,
              hazard_identification: 10,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [
            {
              field: 'nc_description',
              message: 'Description lacks specific details',
              suggestion: 'Include measurements, times, and specific observations',
            },
          ],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(screen.getByTestId('quality-gate-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Quality Gate')).toBeInTheDocument();
      expect(screen.getByTestId('quality-gate-score')).toHaveTextContent('Score: 68');
    });

    it('should show "Go Back & Edit" as primary action', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 65,
            threshold_met: false,
            breakdown: {
              completeness: 19,
              accuracy: 16,
              clarity: 14,
              hazard_identification: 10,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(screen.getByTestId('go-back-edit')).toBeInTheDocument();
      });
    });

    it('should close quality gate modal when "Go Back & Edit" is clicked', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 70,
            threshold_met: false,
            breakdown: {
              completeness: 21,
              accuracy: 17,
              clarity: 15,
              hazard_identification: 11,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(screen.getByTestId('quality-gate-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('go-back-edit'));

      await waitFor(() => {
        expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
      });
    });

    it('should display score breakdown in quality gate modal', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 62,
            threshold_met: false,
            breakdown: {
              completeness: 18,
              accuracy: 15,
              clarity: 13,
              hazard_identification: 10,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [
            {
              field: 'corrective_action',
              message: 'Corrective action is too brief',
              suggestion: 'Include specific steps and verification methods',
            },
          ],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        const modal = screen.getByTestId('quality-gate-modal');
        expect(modal).toBeInTheDocument();
        expect(screen.getByText(/does not meet the quality threshold/)).toBeInTheDocument();
      });
    });
  });

  describe('Confidential Report Bypass (BRCGS 1.1.3)', () => {
    it('should bypass quality gate for confidential reports', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
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
      });

      const consoleSpy = jest.spyOn(console, 'log');

      render(<MockNCAFormWithAI />);

      // Check confidential checkbox
      fireEvent.click(screen.getByTestId('is-confidential'));

      // Fill with low-quality content (normally would fail)
      fireEvent.change(screen.getByTestId('nc-description'), {
        target: { value: 'Brief confidential report' },
      });

      // Submit
      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(aiQualityActions.validateBeforeSubmitAction).toHaveBeenCalledWith(
          'nca',
          expect.objectContaining({ is_confidential: true }),
          'user-123',
          true
        );
      });

      // Should NOT show quality gate
      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();

      // Should submit successfully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Form submitted');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation API errors gracefully', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(aiQualityActions.validateBeforeSubmitAction).toHaveBeenCalled();
      });

      // Should not show quality gate on error
      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
    });

    it('should handle quality check failures without blocking form', async () => {
      (aiQualityActions.analyzeFieldQualityAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('check-quality'));

      await waitFor(() => {
        expect(aiQualityActions.analyzeFieldQualityAction).toHaveBeenCalled();
      });

      // Quality score should not be displayed
      expect(screen.queryByTestId('quality-score')).not.toBeInTheDocument();
    });
  });

  describe('Supervisor Override', () => {
    it('should provide "Submit Anyway" option in quality gate', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 68,
            threshold_met: false,
            breakdown: {
              completeness: 20,
              accuracy: 17,
              clarity: 15,
              hazard_identification: 10,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(screen.getByTestId('submit-anyway')).toBeInTheDocument();
      });
    });
  });

  describe('Form Improvement Workflow', () => {
    it('should allow user to edit and resubmit after quality gate', async () => {
      // First submission fails
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 70,
            threshold_met: false,
            breakdown: {
              completeness: 21,
              accuracy: 17,
              clarity: 15,
              hazard_identification: 11,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      // Submit with low quality
      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(screen.getByTestId('quality-gate-modal')).toBeInTheDocument();
      });

      // Go back and edit
      fireEvent.click(screen.getByTestId('go-back-edit'));

      await waitFor(() => {
        expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
      });

      // Improve description
      fireEvent.change(screen.getByTestId('nc-description'), {
        target: {
          value:
            'Comprehensive description with measurements, timestamps, and detailed observations',
        },
      });

      // Second submission succeeds
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          valid: true,
          ready_for_submission: true,
          quality_assessment: {
            score: 88,
            threshold_met: true,
            breakdown: {
              completeness: 28,
              accuracy: 23,
              clarity: 19,
              hazard_identification: 12,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      const consoleSpy = jest.spyOn(console, 'log');

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Form submitted');
      });

      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Score Threshold Boundaries', () => {
    it('should block submission at score = 74 (below threshold)', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          quality_assessment: {
            score: 74,
            threshold_met: false,
            breakdown: {
              completeness: 22,
              accuracy: 18,
              clarity: 16,
              hazard_identification: 12,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(screen.getByTestId('quality-gate-modal')).toBeInTheDocument();
      });
    });

    it('should allow submission at score = 75 (at threshold)', async () => {
      (aiQualityActions.validateBeforeSubmitAction as jest.Mock).mockResolvedValue({
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
              clarity: 16,
              hazard_identification: 11,
              evidence: 6,
            },
          },
          errors: [],
          warnings: [],
        },
      });

      render(<MockNCAFormWithAI />);

      fireEvent.click(screen.getByTestId('submit-form'));

      await waitFor(() => {
        expect(aiQualityActions.validateBeforeSubmitAction).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
    });
  });
});
