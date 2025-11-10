'use client';

import { FC } from 'react';
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
import { AlertCircle, XCircle, CheckCircle2, Shield } from 'lucide-react';
import type { ValidationResult } from '@/lib/ai/types';

/**
 * Quality Gate Modal Props
 */
export interface QualityGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
  onSubmitAnyway?: () => void;
  validationResult: ValidationResult | null;
  requiresSupervisorOverride?: boolean;
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
  requiresSupervisorOverride = false,
}) => {
  if (!validationResult) return null;

  const { quality_assessment, warnings, errors } = validationResult;
  const { score, threshold_met, breakdown } = quality_assessment;

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
    if (score >= 75) return 'Quality check passed!';
    if (score >= 60) return 'Quality needs improvement';
    return 'Quality below required threshold';
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
            <DialogTitle className="text-xl">Quality Check Results</DialogTitle>
          </div>
          <DialogDescription>
            {threshold_met
              ? 'Your submission meets quality standards.'
              : 'Your submission requires improvement before it can be processed.'}
          </DialogDescription>
        </DialogHeader>

        {/* Score Display */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Quality Score</p>
              <p className={`text-4xl font-bold ${getScoreColor()}`} data-testid="quality-score-display">
                {score}/100
              </p>
              <p className="text-sm text-gray-600 mt-1">{getScoreMessage()}</p>
            </div>
            <Badge variant={threshold_met ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {threshold_met ? 'PASS' : 'NEEDS WORK'}
            </Badge>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-2 mt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Score Breakdown:</p>
            <ScoreBreakdownItem
              label="Completeness"
              score={breakdown.completeness}
              maxScore={30}
            />
            <ScoreBreakdownItem label="Accuracy" score={breakdown.accuracy} maxScore={25} />
            <ScoreBreakdownItem label="Clarity" score={breakdown.clarity} maxScore={20} />
            <ScoreBreakdownItem
              label="Hazard Identification"
              score={breakdown.hazard_identification}
              maxScore={15}
            />
            <ScoreBreakdownItem label="Evidence" score={breakdown.evidence} maxScore={10} />
          </div>
        </div>

        {/* Errors */}
        {errors && errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Errors Found:</p>
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

        {/* Warnings / Suggestions */}
        {warnings && warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-2">Suggestions for Improvement:</p>
                <ul className="space-y-3">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      <p className="text-yellow-800">
                        <span className="font-medium">{warning.field}:</span> {warning.message}
                      </p>
                      {warning.suggestion && (
                        <p className="text-yellow-700 ml-4 mt-1 italic">
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

        {/* BRCGS Compliance Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-blue-800">
              <span className="font-semibold">BRCGS Compliance:</span> Quality checks ensure
              submissions meet food safety documentation standards (Section 3.3 - Document Control).
            </p>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="flex gap-3 sm:gap-3">
          {threshold_met ? (
            // Score >= 75: Allow submission
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
            // Score < 75: Block or require override
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
                <Button
                  variant="destructive"
                  onClick={onSubmitAnyway}
                  data-testid="quality-gate-submit-anyway"
                  disabled={requiresSupervisorOverride}
                  className="flex-1"
                >
                  {requiresSupervisorOverride
                    ? 'Supervisor Override Required'
                    : 'Submit Anyway (Not Recommended)'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Score Breakdown Item Component
 */
interface ScoreBreakdownItemProps {
  label: string;
  score: number;
  maxScore: number;
}

const ScoreBreakdownItem: FC<ScoreBreakdownItemProps> = ({ label, score, maxScore }) => {
  const percentage = (score / maxScore) * 100;

  const getColor = (): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-gray-700 w-40">{label}</p>
      <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-sm font-semibold text-gray-700 w-12 text-right">
        {score}/{maxScore}
      </p>
    </div>
  );
};
