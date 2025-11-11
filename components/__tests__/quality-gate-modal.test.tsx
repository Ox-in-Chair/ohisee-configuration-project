/**
 * Quality Gate Modal Component Tests
 * Tests submission validation, requirements display, and manager approval flow
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { QualityGateModal } from '../quality-gate-modal';
import type { ValidationResult } from '@/lib/ai/types';

describe('QualityGateModal', () => {
  const mockValidationResult: ValidationResult = {
    valid: true,
    ready_for_submission: true,
    quality_assessment: {
      score: 85,
      threshold_met: true,
      breakdown: {
        completeness: 25,
        accuracy: 20,
        clarity: 18,
        hazard_identification: 12,
        evidence: 10,
      },
    },
    errors: [],
    warnings: [],
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onGoBack: jest.fn(),
    validationResult: mockValidationResult,
    requiresManagerApproval: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<QualityGateModal {...defaultProps} />);
      expect(screen.getByTestId('quality-gate-modal')).toBeInTheDocument();
    });

    it('should not render when validationResult is null', () => {
      render(<QualityGateModal {...defaultProps} validationResult={null} />);
      expect(screen.queryByTestId('quality-gate-modal')).not.toBeInTheDocument();
    });

    it('should display "Submission Validation" title', () => {
      render(<QualityGateModal {...defaultProps} />);
      expect(screen.getByText('Submission Validation')).toBeInTheDocument();
    });
  });

  describe('Validation Status Display', () => {
    it('should show "Validation passed" when threshold is met', () => {
      render(<QualityGateModal {...defaultProps} />);
      expect(screen.getByText('Validation passed')).toBeInTheDocument();
      expect(screen.getByText('PASS')).toBeInTheDocument();
    });

    it('should show "Additional details required" when score is 60-74', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 65,
          threshold_met: false,
        },
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText('Additional details required')).toBeInTheDocument();
      expect(screen.getByText('REVIEW REQUIRED')).toBeInTheDocument();
    });

    it('should show "Incomplete information" when score is below 60', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 45,
          threshold_met: false,
        },
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText('Incomplete information')).toBeInTheDocument();
    });
  });

  describe('Requirements Display', () => {
    it('should display requirements checklist when present', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 60,
          threshold_met: false,
        },
        requirements: [
          {
            field: 'Corrective Action',
            message: 'Include at least one verification method with timeline.',
            reference: 'BRCGS 5.7.2',
            exampleFix: 'Example: QA will verify on next batch (due 10-Oct)',
          },
        ],
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText('Additional Details Required:')).toBeInTheDocument();
      expect(screen.getByText(/Corrective Action:/)).toBeInTheDocument();
      expect(screen.getByText(/Include at least one verification method/)).toBeInTheDocument();
    });

    it('should display BRCGS references for requirements', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 60,
          threshold_met: false,
        },
        requirements: [
          {
            field: 'NC Description',
            message: 'Missing time of occurrence',
            reference: 'BRCGS 5.7.2',
          },
        ],
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText(/Reference: BRCGS 5.7.2/)).toBeInTheDocument();
    });

    it('should display example fixes for requirements', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 60,
          threshold_met: false,
        },
        requirements: [
          {
            field: 'Root Cause Analysis',
            message: 'Needs more depth',
            exampleFix: 'Example: Use 5-Why method',
          },
        ],
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText(/Example: Use 5-Why method/)).toBeInTheDocument();
    });
  });

  describe('Errors Display', () => {
    it('should display critical errors', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 40,
          threshold_met: false,
        },
        errors: [
          {
            field: 'NC Description',
            message: 'Description must be at least 150 characters',
            brcgs_requirement: 'BRCGS 5.7.2',
          },
        ],
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText('Critical Issues Found:')).toBeInTheDocument();
      expect(screen.getByText(/NC Description:/)).toBeInTheDocument();
    });
  });

  describe('Manager Approval Flow', () => {
    it('should show "Request Manager Approval" button when required', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 50,
          threshold_met: false,
        },
      };
      render(
        <QualityGateModal
          {...defaultProps}
          validationResult={result}
          requiresManagerApproval={true}
        />
      );
      expect(screen.getByText('Request Manager Approval')).toBeInTheDocument();
    });

    it('should show justification field when approval button is clicked', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 50,
          threshold_met: false,
        },
      };
      render(
        <QualityGateModal
          {...defaultProps}
          validationResult={result}
          requiresManagerApproval={true}
        />
      );

      const button = screen.getByText('Request Manager Approval');
      fireEvent.click(button);

      expect(screen.getByLabelText(/Justification for Manager Approval/)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/Please provide a detailed justification/)
      ).toBeInTheDocument();
    });

    it('should require minimum 50 characters for justification', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 50,
          threshold_met: false,
        },
      };
      render(
        <QualityGateModal
          {...defaultProps}
          validationResult={result}
          requiresManagerApproval={true}
        />
      );

      const button = screen.getByText('Request Manager Approval');
      fireEvent.click(button);

      const submitButton = screen.getByText('Submit for Manager Approval');
      expect(submitButton).toBeDisabled();

      const justification = screen.getByPlaceholderText(/Please provide a detailed justification/);
      fireEvent.change(justification, { target: { value: 'A'.repeat(49) } });

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/49\/50 characters minimum/)).toBeInTheDocument();
    });

    it('should enable submit button when justification meets minimum', () => {
      const onSubmitAnyway = jest.fn();
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 50,
          threshold_met: false,
        },
      };
      render(
        <QualityGateModal
          {...defaultProps}
          validationResult={result}
          requiresManagerApproval={true}
          onSubmitAnyway={onSubmitAnyway}
        />
      );

      const button = screen.getByText('Request Manager Approval');
      fireEvent.click(button);

      const justification = screen.getByPlaceholderText(/Please provide a detailed justification/);
      fireEvent.change(justification, { target: { value: 'A'.repeat(50) } });

      const submitButton = screen.getByText('Submit for Manager Approval');
      expect(submitButton).not.toBeDisabled();

      fireEvent.click(submitButton);
      expect(onSubmitAnyway).toHaveBeenCalledWith('A'.repeat(50));
    });
  });

  describe('Actions', () => {
    it('should call onGoBack when "Go Back & Edit" is clicked', () => {
      const onGoBack = jest.fn();
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 60,
          threshold_met: false,
        },
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} onGoBack={onGoBack} />);

      const button = screen.getByText('Go Back & Edit');
      fireEvent.click(button);

      expect(onGoBack).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when "Proceed with Submission" is clicked', () => {
      const onClose = jest.fn();
      render(<QualityGateModal {...defaultProps} onClose={onClose} />);

      const button = screen.getByText('Proceed with Submission');
      fireEvent.click(button);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmitAnyway when "Submit Anyway" is clicked (not recommended)', () => {
      const onSubmitAnyway = jest.fn();
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 60,
          threshold_met: false,
        },
      };
      render(
        <QualityGateModal
          {...defaultProps}
          validationResult={result}
          onSubmitAnyway={onSubmitAnyway}
          requiresManagerApproval={false}
        />
      );

      const button = screen.getByText('Submit Anyway (Not Recommended)');
      fireEvent.click(button);

      expect(onSubmitAnyway).toHaveBeenCalledTimes(1);
    });
  });

  describe('Compliance Display', () => {
    it('should display compliance summary when present', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        compliance: {
          passed: true,
          checked_sections: ['BRCGS 5.7.2', 'BRCGS 5.3'],
        },
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText('Compliance Check:')).toBeInTheDocument();
      expect(screen.getByText(/All checked sections meet requirements/)).toBeInTheDocument();
    });

    it('should display BRCGS compliance note when validation fails', () => {
      const result: ValidationResult = {
        ...mockValidationResult,
        quality_assessment: {
          ...mockValidationResult.quality_assessment,
          score: 60,
          threshold_met: false,
        },
      };
      render(<QualityGateModal {...defaultProps} validationResult={result} />);
      expect(screen.getByText(/BRCGS Compliance:/)).toBeInTheDocument();
    });
  });
});

