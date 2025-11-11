'use client';

import { FC, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, XCircle, CheckCircle2, Shield, FileText } from 'lucide-react';
import type { ValidationResult } from '@/lib/ai/types';
import { UserExplanation } from '@/lib/ai/explainable/user-explanation-component';
import { TransparencyService } from '@/lib/ai/explainable/transparency-service';
import { getPhase7Config } from '@/lib/config/phase7-config';

/**
 * Quality Gate Modal Props
 */
export interface QualityGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
  onSubmitAnyway?: (justification?: string) => void;
  validationResult: ValidationResult | null;
  requiresManagerApproval?: boolean;
}

/**
 * Quality Gate Modal Component
 *
 * Blocks submission when quality score < 75
 * Shows detailed feedback and suggestions for improvement
 * Allows supervisor override with audit trail
 *
 * @example
 * ```tsx
 * <QualityGateModal
 *   isOpen={showQualityGate}
 *   onClose={() => setShowQualityGate(false)}
 *   onGoBack={() => setShowQualityGate(false)}
 *   onSubmitAnyway={handleSupervisorOverride}
 *   validationResult={validation}
 *   requiresSupervisorOverride={validation.quality_assessment.score < 75}
 * />
 * ```
 */
export const QualityGateModal: FC<QualityGateModalProps> = ({
  isOpen,
  onClose,
  onGoBack,
  onSubmitAnyway,
  validationResult,
  requiresManagerApproval = false,
}) => {
  const [justification, setJustification] = useState('');
  const [showJustificationField, setShowJustificationField] = useState(false);

  if (!validationResult) return null;

  const { quality_assessment, warnings, errors, requirements, compliance } = validationResult;
  const { score, threshold_met } = quality_assessment;
  const config = getPhase7Config();
  const transparency = config.explainableAI.enabled ? new TransparencyService() : null;

  // Determine modal variant based on score
  const getScoreColor = (): string => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = () => {
    if (score >= 75) return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-6 w-6 text-yellow-600" />;
    return <XCircle className="h-6 w-6 text-red-600" />;
  };

  const getScoreMessage = (): string => {
    if (score >= 75) return 'Validation passed';
    if (score >= 60) return 'Additional details required';
    return 'Incomplete information';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="quality-gate-modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getScoreIcon()}
            <DialogTitle className="text-xl">Submission Validation</DialogTitle>
          </div>
          <DialogDescription>
            {threshold_met
              ? 'Your submission meets quality standards.'
              : 'Your submission requires improvement before it can be processed.'}
          </DialogDescription>
        </DialogHeader>

        {/* Validation Status */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Validation Status</p>
              <p className={`text-2xl font-bold ${getScoreColor()}`} data-testid="validation-status">
                {getScoreMessage()}
              </p>
            </div>
            <Badge variant={threshold_met ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {threshold_met ? 'PASS' : 'REVIEW REQUIRED'}
            </Badge>
          </div>
        </div>

        {/* Requirements Checklist */}
        {requirements && requirements.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-2">Additional Details Required:</p>
                <ul className="space-y-2">
                  {requirements.map((req, index) => {
                    const explanation = transparency
                      ? transparency.explainValidationDecision('requirements', req as any, validationResult)
                      : null;

                    return (
                      <li key={index} className="text-sm">
                        {config.explainableAI.showUserExplanations && explanation ? (
                          <UserExplanation
                            field={req.field}
                            message={`${req.field}: ${req.message}`}
                            explanation={explanation.reason}
                            ruleReference={req.reference || explanation.ruleReference}
                            example={req.exampleFix || explanation.example}
                          />
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="h-4 w-4 rounded-full border-2 border-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-yellow-800">
                                <span className="font-medium">{req.field}:</span> {req.message}
                              </p>
                              {req.reference && (
                                <p className="text-xs text-yellow-700 mt-1 ml-4">
                                  Reference: {req.reference}
                                </p>
                              )}
                              {req.exampleFix && (
                                <p className="text-xs text-yellow-700 mt-1 ml-4 italic">
                                  💡 {req.exampleFix}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors && errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Critical Issues Found:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-800">
                      <span className="font-medium">{error.field}:</span> {error.message}
                      {error.brcgs_requirement && (
                        <p className="ml-5 text-xs text-red-700 mt-1">
                          BRCGS: {error.brcgs_requirement}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warnings / Suggestions (if no requirements shown) */}
        {warnings && warnings.length > 0 && (!requirements || requirements.length === 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-2">Suggestions for Improvement:</p>
                <ul className="space-y-3">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      <p className="text-blue-800">
                        <span className="font-medium">{warning.field}:</span> {warning.message}
                      </p>
                      {warning.suggestion && (
                        <p className="text-blue-700 ml-4 mt-1 italic">
                          💡 {warning.suggestion}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Summary */}
        {compliance && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 mb-1">Compliance Check:</p>
                <p className="text-green-800">
                  {compliance.passed
                    ? 'All checked sections meet requirements.'
                    : 'Some sections require attention.'}
                </p>
                {compliance.checked_sections && compliance.checked_sections.length > 0 && (
                  <p className="text-xs text-green-700 mt-1">
                    Checked: {compliance.checked_sections.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BRCGS Compliance Note */}
        {(!compliance || !compliance.passed) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-blue-800">
                <span className="font-semibold">BRCGS Compliance:</span> System validation ensures
                submissions meet food safety documentation standards (Section 3.3 - Document Control).
              </p>
            </div>
          </div>
        )}

        {/* Manager Approval Justification Field */}
        {showJustificationField && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <Label htmlFor="justification" className="text-sm font-semibold text-gray-900 mb-2 block">
              Justification for Manager Approval (Required)
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Please provide a detailed justification explaining why this submission should be approved despite incomplete information (minimum 50 characters)..."
              rows={4}
              className="mb-2"
              minLength={50}
              data-testid="manager-approval-justification"
            />
            <p className="text-xs text-gray-600">
              {justification.length}/50 characters minimum. This justification will be logged for audit purposes.
            </p>
          </div>
        )}

        {/* Actions */}
        <DialogFooter className="flex gap-3 sm:gap-3">
          {threshold_met ? (
            // Validation passed: Allow submission
            <>
              <Button variant="outline" onClick={onGoBack} data-testid="quality-gate-go-back">
                Go Back & Review
              </Button>
              <Button
                variant="default"
                onClick={onClose}
                data-testid="quality-gate-proceed"
                className="bg-green-600 hover:bg-green-700"
              >
                Proceed with Submission
              </Button>
            </>
          ) : (
            // Validation failed: Block or require manager approval
            <>
              <Button
                variant="default"
                onClick={onGoBack}
                data-testid="quality-gate-go-back"
                className="flex-1"
              >
                Go Back & Edit
              </Button>
              {onSubmitAnyway && (
                <>
                  {!showJustificationField ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (requiresManagerApproval) {
                          setShowJustificationField(true);
                        } else {
                          onSubmitAnyway();
                        }
                      }}
                      data-testid="quality-gate-request-approval"
                      className="flex-1"
                    >
                      {requiresManagerApproval
                        ? 'Request Manager Approval'
                        : 'Submit Anyway (Not Recommended)'}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (justification.length >= 50) {
                          onSubmitAnyway(justification);
                          setJustification('');
                          setShowJustificationField(false);
                        }
                      }}
                      data-testid="quality-gate-submit-approval"
                      disabled={justification.length < 50}
                      className="flex-1"
                    >
                      Submit for Manager Approval
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

