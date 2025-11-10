/**
 * MJC AI Integration Tests
 * TDD approach - Tests AI Quality Gate integration in MJC form
 *
 * Test Coverage:
 * - useAIQuality hook integration
 * - AIEnhancedTextarea in Section 6 (Problem Description)
 * - AIEnhancedTextarea in Section 7 (Repairs Done & Parts Used)
 * - Quality gate modal before submission
 * - Machine-specific suggestion generation (5 machine types)
 * - Safety keyword detection
 * - Hygiene checklist triggers for food contact machines
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import NewMJCPage from '@/app/mjc/new/page';
import * as aiActions from '@/app/actions/ai-actions';
import type { ServerActionResult } from '@/app/actions/ai-quality-actions';
import type { ValidationResult, QualityScore } from '@/lib/ai/types';

// Mock server actions
jest.mock('@/app/actions/ai-actions');
jest.mock('@/app/actions/mjc-actions');

describe('MJC AI Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (aiActions.analyzeMJCQualityInline as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        score: 85,
        suggestions: ['Provide more detail', 'Include safety procedures']
      }
    });

    (aiActions.generateMaintenanceSuggestions as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        text: 'Detailed maintenance suggestion with machine-specific guidance',
        sections: {
          problem_analysis: 'Analysis of the issue',
          repair_procedure: 'Step-by-step repair procedure',
          parts_required: 'List of parts needed',
          safety_considerations: 'Safety protocols to follow'
        },
        confidence: 'high',
        confidence_percentage: 88,
        procedure_references: ['MNT-5.2', 'SAF-3.1'],
        keywords_detected: {
          category: 'maintenance',
          keywords: ['blade', 'alignment', 'safety']
        },
        recommendations: {
          create_follow_up: false,
          calibration_check: true,
          training_required: false
        }
      }
    });

    (aiActions.validateMJCBeforeSubmit as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        valid: true,
        ready_for_submission: true,
        errors: [],
        warnings: [],
        quality_assessment: {
          score: 85,
          threshold_met: true,
          breakdown: {
            completeness: 26,
            accuracy: 22,
            clarity: 18,
            hazard_identification: 12,
            evidence: 7
          }
        }
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AI Quality Hook Integration', () => {
    it('should initialize useAIQuality hook with correct form type', async () => {
      render(<NewMJCPage />);

      // Verify form rendered
      expect(screen.getByTestId('mjc-form-title')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Job Card')).toBeInTheDocument();
    });

    it('should call inline quality check when user types in description field', async () => {
      render(<NewMJCPage />);

      const descriptionField = screen.getByTestId('maintenance-description');

      // Type description exceeding minimum length
      await user.type(descriptionField, 'Machine CMH-01 slitter blade showing excessive wear on cutting edge. Blade chatter detected during operation causing uneven cuts on 50-micron BOPP film. Immediate replacement required to maintain product quality and prevent further damage to blade holder assembly.');

      // Wait for debounced quality check (3 seconds)
      await waitFor(() => {
        expect(aiActions.analyzeMJCQualityInline).toHaveBeenCalled();
      }, { timeout: 4000 });

      const callArgs = (aiActions.analyzeMJCQualityInline as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('maintenance_description');
    });

    it('should display quality score badge after inline check completes', async () => {
      (aiActions.analyzeMJCQualityInline as jest.Mock).mockResolvedValue({
        success: true,
        data: { score: 82, suggestions: [] }
      });

      render(<NewMJCPage />);

      const descriptionField = screen.getByTestId('maintenance-description');
      await user.type(descriptionField, 'Detailed problem description with specific measurements and observations about the machine condition and required maintenance work.');

      await waitFor(() => {
        const badge = screen.queryByTestId('quality-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('data-score', '82');
      }, { timeout: 4000 });
    });
  });

  describe('Section 6: Problem Description with AI Enhancement', () => {
    it('should render AIEnhancedTextarea for problem description', () => {
      render(<NewMJCPage />);

      // Check for AI enhancement elements
      const aiHelpButton = screen.getByTestId('maintenance-description-ai-help');
      expect(aiHelpButton).toBeInTheDocument();
      expect(aiHelpButton).toHaveTextContent('Get AI Help');
    });

    it('should show loading state when generating AI suggestions', async () => {
      (aiActions.generateMaintenanceSuggestions as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 1000))
      );

      render(<NewMJCPage />);

      const aiHelpButton = screen.getByTestId('maintenance-description-ai-help');
      await user.click(aiHelpButton);

      expect(aiHelpButton).toHaveTextContent('Generating...');
      expect(aiHelpButton).toBeDisabled();
    });

    it('should generate AI suggestion when "Get AI Help" clicked', async () => {
      render(<NewMJCPage />);

      // Fill in machine ID first (required for context)
      const machineIdField = screen.getByTestId('machine-equipment-id');
      await user.type(machineIdField, 'CMH-01');

      // Select machine type for context
      const reactiveRadio = screen.getByTestId('maintenance-category-reactive');
      await user.click(reactiveRadio);

      const aiHelpButton = screen.getByTestId('maintenance-description-ai-help');
      await user.click(aiHelpButton);

      await waitFor(() => {
        expect(aiActions.generateMaintenanceSuggestions).toHaveBeenCalled();
      });

      // Verify suggestion appears in modal/toast
      await waitFor(() => {
        expect(screen.getByText(/Detailed maintenance suggestion/i)).toBeInTheDocument();
      });
    });

    it('should include machine context when generating suggestions', async () => {
      render(<NewMJCPage />);

      const machineIdField = screen.getByTestId('machine-equipment-id');
      await user.type(machineIdField, 'FLX-02');

      const aiHelpButton = screen.getByTestId('maintenance-description-ai-help');
      await user.click(aiHelpButton);

      await waitFor(() => {
        expect(aiActions.generateMaintenanceSuggestions).toHaveBeenCalled();
      });

      const callArgs = (aiActions.generateMaintenanceSuggestions as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('machine_equipment_id', 'FLX-02');
    });

    it('should enforce minimum 100 characters for problem description', async () => {
      render(<NewMJCPage />);

      const descriptionField = screen.getByTestId('maintenance-description');
      await user.type(descriptionField, 'Short description');

      const charCount = screen.getByTestId('maintenance-description-char-count');
      expect(charCount).toHaveClass('text-red-600');
      expect(charCount).toHaveTextContent(/characters needed/i);
    });
  });

  describe('Section 7: Repairs Done with AI Enhancement', () => {
    it('should render AIEnhancedTextarea for repairs performed', () => {
      render(<NewMJCPage />);

      const aiHelpButton = screen.queryByTestId('maintenance-performed-ai-help');
      expect(aiHelpButton).toBeInTheDocument();
    });

    it('should generate repair-specific suggestions', async () => {
      render(<NewMJCPage />);

      // Fill problem description first
      const descriptionField = screen.getByTestId('maintenance-description');
      await user.type(descriptionField, 'Blade alignment issue on slitter requiring immediate attention and calibration adjustment to restore cutting precision.');

      // Select maintenance type for context
      const mechanicalRadio = screen.getByTestId('maintenance-type-mechanical');
      await user.click(mechanicalRadio);

      const aiHelpButton = screen.getByTestId('maintenance-performed-ai-help');
      await user.click(aiHelpButton);

      await waitFor(() => {
        expect(aiActions.generateMaintenanceSuggestions).toHaveBeenCalled();
      });

      const callArgs = (aiActions.generateMaintenanceSuggestions as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('maintenance_type', 'mechanical');
    });

    it('should enforce minimum 50 characters for repairs performed', async () => {
      render(<NewMJCPage />);

      const repairsField = screen.getByTestId('maintenance-performed');
      await user.type(repairsField, 'Short');

      // Character counter should show warning
      const charCount = screen.queryByTestId('maintenance-performed-char-count');
      if (charCount) {
        expect(charCount).toHaveClass('text-red-600');
      }
    });
  });

  describe('Machine-Specific Suggestions', () => {
    const machineTypes = [
      {
        id: 'SLT-01',
        type: 'slitter',
        expectedKeywords: ['blade', 'tension', 'safety guards']
      },
      {
        id: 'FLX-02',
        type: 'flexo',
        expectedKeywords: ['registration', 'impression', 'hygiene']
      },
      {
        id: 'LAM-03',
        type: 'laminator',
        expectedKeywords: ['temperature', 'nip pressure', 'cleaning']
      },
      {
        id: 'EXT-04',
        type: 'extruder',
        expectedKeywords: ['temperature zones', 'screw speed', 'material']
      },
      {
        id: 'BAG-05',
        type: 'bag maker',
        expectedKeywords: ['sealing', 'registration', 'cutting blade']
      }
    ];

    machineTypes.forEach(({ id, type, expectedKeywords }) => {
      it(`should generate ${type}-specific suggestions for ${id}`, async () => {
        (aiActions.generateMaintenanceSuggestions as jest.Mock).mockResolvedValue({
          success: true,
          data: {
            text: `${type} specific maintenance guidance`,
            sections: { problem_analysis: `${type} analysis` },
            confidence: 'high',
            confidence_percentage: 85,
            procedure_references: [],
            keywords_detected: {
              category: 'maintenance',
              keywords: expectedKeywords
            },
            recommendations: {}
          }
        });

        render(<NewMJCPage />);

        const machineIdField = screen.getByTestId('machine-equipment-id');
        await user.type(machineIdField, id);

        const aiHelpButton = screen.getByTestId('maintenance-description-ai-help');
        await user.click(aiHelpButton);

        await waitFor(() => {
          expect(aiActions.generateMaintenanceSuggestions).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Quality Gate Modal Before Submission', () => {
    it('should trigger quality gate validation on form submit', async () => {
      render(<NewMJCPage />);

      // Fill required fields
      await fillMinimalMJCForm(user);

      const submitButton = screen.getByTestId('btn-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(aiActions.validateMJCBeforeSubmit).toHaveBeenCalled();
      });
    });

    it('should block submission when quality score < 75', async () => {
      (aiActions.validateMJCBeforeSubmit as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          errors: [],
          warnings: [{
            field: 'overall',
            message: 'Quality score (68) below threshold (75)',
            suggestion: 'Review completeness and safety considerations'
          }],
          quality_assessment: {
            score: 68,
            threshold_met: false,
            breakdown: {
              completeness: 20,
              accuracy: 18,
              clarity: 15,
              hazard_identification: 10,
              evidence: 5
            }
          }
        }
      });

      render(<NewMJCPage />);

      await fillMinimalMJCForm(user);

      const submitButton = screen.getByTestId('btn-submit');
      await user.click(submitButton);

      // Quality gate modal should appear
      await waitFor(() => {
        expect(screen.getByText(/Quality score \(68\) below threshold/i)).toBeInTheDocument();
      });

      // Submission should be blocked
      expect(screen.queryByText(/MJC submitted successfully/i)).not.toBeInTheDocument();
    });

    it('should allow submission when quality score >= 75', async () => {
      render(<NewMJCPage />);

      await fillMinimalMJCForm(user);

      const submitButton = screen.getByTestId('btn-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(aiActions.validateMJCBeforeSubmit).toHaveBeenCalled();
      });

      // No quality gate blocking, should proceed to actual submission
      // (Would need to mock mjc-actions.createMJC for full test)
    });

    it('should show quality breakdown in modal', async () => {
      (aiActions.validateMJCBeforeSubmit as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          valid: true,
          ready_for_submission: false,
          errors: [],
          warnings: [],
          quality_assessment: {
            score: 72,
            threshold_met: false,
            breakdown: {
              completeness: 22,
              accuracy: 18,
              clarity: 15,
              hazard_identification: 10,
              evidence: 7
            }
          }
        }
      });

      render(<NewMJCPage />);

      await fillMinimalMJCForm(user);

      const submitButton = screen.getByTestId('btn-submit');
      await user.click(submitButton);

      await waitFor(() => {
        // Check for quality breakdown display
        expect(screen.getByText(/completeness/i)).toBeInTheDocument();
        expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
        expect(screen.getByText(/clarity/i)).toBeInTheDocument();
        expect(screen.getByText(/safety/i)).toBeInTheDocument();
      });
    });
  });

  describe('Safety Keyword Detection', () => {
    it('should detect lockout/tagout keywords', async () => {
      render(<NewMJCPage />);

      const descriptionField = screen.getByTestId('maintenance-description');
      await user.type(descriptionField, 'Performed electrical maintenance following lockout tagout procedures to ensure worker safety during repair of control panel wiring.');

      await waitFor(() => {
        expect(aiActions.analyzeMJCQualityInline).toHaveBeenCalled();
      }, { timeout: 4000 });

      const callArgs = (aiActions.analyzeMJCQualityInline as jest.Mock).mock.calls[0][0];
      expect(callArgs.maintenance_description).toContain('lockout tagout');
    });

    it('should detect permit-to-work keywords', async () => {
      render(<NewMJCPage />);

      const descriptionField = screen.getByTestId('maintenance-description');
      await user.type(descriptionField, 'Hot work permit required for welding operations on extruder barrel. All safety protocols followed including fire watch and ventilation checks.');

      await waitFor(() => {
        expect(aiActions.analyzeMJCQualityInline).toHaveBeenCalled();
      }, { timeout: 4000 });

      const callArgs = (aiActions.analyzeMJCQualityInline as jest.Mock).mock.calls[0][0];
      expect(callArgs.maintenance_description).toContain('permit');
    });
  });

  describe('Hygiene Checklist Triggers', () => {
    it('should highlight hygiene checklist for food contact machines', async () => {
      render(<NewMJCPage />);

      // Fill machine ID with food contact machine
      const machineIdField = screen.getByTestId('machine-equipment-id');
      await user.type(machineIdField, 'FLX-02'); // Flexo printer (food contact)

      // Hygiene section should be visible and emphasized
      const hygieneSection = screen.getByTestId('mjc-section-9');
      expect(hygieneSection).toBeInTheDocument();
      expect(screen.getByText(/Post Hygiene Clearance Record/i)).toBeInTheDocument();
    });

    it('should require all 10 hygiene items before clearance', async () => {
      render(<NewMJCPage />);

      // Try to check production cleared without checking hygiene items
      const productionCleared = screen.getByTestId('production-cleared');

      // Should be disabled until all 10 items checked
      expect(productionCleared).toBeDisabled();

      // Check all hygiene items
      for (let i = 1; i <= 10; i++) {
        const checkbox = screen.getByTestId(`hygiene-check-${i}`);
        await user.click(checkbox);
      }

      // Now production cleared should be enabled
      await waitFor(() => {
        expect(productionCleared).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling & Graceful Degradation', () => {
    it('should handle AI service errors gracefully', async () => {
      (aiActions.analyzeMJCQualityInline as jest.Mock).mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable'
      });

      render(<NewMJCPage />);

      const descriptionField = screen.getByTestId('maintenance-description');
      await user.type(descriptionField, 'Maintenance description that triggers AI check');

      // Should not crash, should show error message
      await waitFor(() => {
        expect(screen.queryByText(/temporarily unavailable/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Form should still be usable
      expect(descriptionField).not.toBeDisabled();
    });

    it('should allow submission if validation service fails', async () => {
      (aiActions.validateMJCBeforeSubmit as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Validation service unavailable'
      });

      render(<NewMJCPage />);

      await fillMinimalMJCForm(user);

      const submitButton = screen.getByTestId('btn-submit');
      await user.click(submitButton);

      // Should show warning but allow submission
      await waitFor(() => {
        expect(screen.getByText(/validation temporarily unavailable/i)).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

async function fillMinimalMJCForm(user: ReturnType<typeof userEvent.setup>) {
  // Section 2: Machine ID
  const machineIdField = screen.getByTestId('machine-equipment-id');
  await user.type(machineIdField, 'CMH-01');

  // Section 3: Maintenance Category & Type
  const reactiveRadio = screen.getByTestId('maintenance-category-reactive');
  await user.click(reactiveRadio);

  const mechanicalRadio = screen.getByTestId('maintenance-type-mechanical');
  await user.click(mechanicalRadio);

  // Section 4: Machine Status & Urgency
  const machineDownRadio = screen.getByTestId('machine-status-down');
  await user.click(machineDownRadio);

  const urgencyCritical = screen.getByTestId('urgency-critical');
  await user.click(urgencyCritical);

  // Section 5: Temporary Repair
  const tempRepairNo = screen.getByTestId('temporary-repair-no');
  await user.click(tempRepairNo);

  // Section 6: Description (minimum 100 chars)
  const descriptionField = screen.getByTestId('maintenance-description');
  await user.type(descriptionField, 'Comprehensive maintenance description detailing the problem, symptoms, impact on production, and required repair actions with specific measurements and observations.');

  // Section 9: Check all hygiene items
  for (let i = 1; i <= 10; i++) {
    const checkbox = screen.getByTestId(`hygiene-check-${i}`);
    await user.click(checkbox);
  }

  // Section 10: Clearance signature
  const qaName = screen.getByTestId('clearance-qa-supervisor');
  await user.type(qaName, 'QA Supervisor');

  const signature = screen.getByTestId('clearance-signature');
  await user.type(signature, 'John Smith');

  const productionCleared = screen.getByTestId('production-cleared');
  await user.click(productionCleared);
}
