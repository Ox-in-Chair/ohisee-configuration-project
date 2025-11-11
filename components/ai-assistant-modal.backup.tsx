import { FC, useState, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ValidationResult } from '@/lib/ai/types';

/**
 * AIAssistantModal Props Interface
 */
export interface AIAssistantModalProps {
  open: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  onGoBack: () => void;
  onSubmitAnyway: (overrideReason: string) => void;
}

/**
 * AI Assistant Modal (Quality Gate)
 *
 * Shown when quality score < 75 to give user option to:
 * 1. Go back and edit (recommended)
 * 2. Submit anyway with supervisor override reason (audit trail)
 *
 * @example
 * ```tsx
 * <AIAssistantModal
 *   open={showQualityGate}
 *   onClose={() => setShowQualityGate(false)}
 *   validationResult={validation}
 *   onGoBack={handleGoBack}
 *   onSubmitAnyway={handleOverride}
 * />
 * ```
 */
export const AIAssistantModal: FC<AIAssistantModalProps> = ({
  open,
  onClose,
  validationResult,
  onGoBack,
  onSubmitAnyway,
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open || !validationResult) {
    return null;
  }

  const { quality_assessment, errors, warnings, ready_for_submission } = validationResult;

  const handleSubmitWithOverride = async (e: FormEvent) => {
    e.preventDefault();

    if (overrideReason.trim().length < 20) {
      alert('Override reason must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);
    await onSubmitAnyway(overrideReason);
    setIsSubmitting(false);
  };

  // Determine severity color
  const getSeverityColor = (score: number): string => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" data-testid="quality-gate-modal">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {quality_assessment.threshold_met ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                )}
                <div>
                  <CardTitle>Quality Check Results</CardTitle>
                  <CardDescription>
                    {quality_assessment.threshold_met
                      ? 'Your submission meets quality standards'
                      : 'Some improvements recommended before submission'}
                  </CardDescription>
                </div>
              </div>

              <Badge
                variant={quality_assessment.threshold_met ? 'default' : 'destructive'}
                className="text-lg px-4 py-2"
                data-testid="modal-quality-score"
              >
                {quality_assessment.score}/100
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">Score Breakdown</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Completeness:</span>
                  <span className={getSeverityColor((quality_assessment.breakdown.completeness / 30) * 100)}>
                    {quality_assessment.breakdown.completeness}/30
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className={getSeverityColor((quality_assessment.breakdown.accuracy / 25) * 100)}>
                    {quality_assessment.breakdown.accuracy}/25
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clarity:</span>
                  <span className={getSeverityColor((quality_assessment.breakdown.clarity / 20) * 100)}>
                    {quality_assessment.breakdown.clarity}/20
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hazard ID:</span>
                  <span className={getSeverityColor((quality_assessment.breakdown.hazard_identification / 15) * 100)}>
                    {quality_assessment.breakdown.hazard_identification}/15
                  </span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span>Evidence:</span>
                  <span className={getSeverityColor((quality_assessment.breakdown.evidence / 10) * 100)}>
                    {quality_assessment.breakdown.evidence}/10
                  </span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Critical Issues ({errors.length})
                </h3>
                <div className="space-y-2">
                  {errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="bg-red-50 border border-red-200 rounded p-3 text-sm"
                      data-testid={`error-${idx}`}
                    >
                      <p className="font-medium text-red-800">{error.field}</p>
                      <p className="text-red-700">{error.message}</p>
                      {error.brcgs_requirement && (
                        <p className="text-xs text-red-600 mt-1">
                          BRCGS: {error.brcgs_requirement}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings && warnings.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-yellow-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Suggestions for Improvement ({warnings.length})
                </h3>
                <div className="space-y-2">
                  {warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm"
                      data-testid={`warning-${idx}`}
                    >
                      <p className="font-medium text-yellow-800">{warning.field}</p>
                      <p className="text-yellow-700">{warning.message}</p>
                      <p className="text-green-700 mt-1 text-xs">
                        Suggestion: {warning.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Override Form (only if below threshold) */}
            {!quality_assessment.threshold_met && (
              <form onSubmit={handleSubmitWithOverride} className="space-y-4 border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <h3 className="font-semibold text-sm text-yellow-800 mb-2">
                    Supervisor Override Required
                  </h3>
                  <p className="text-sm text-yellow-700">
                    If you need to submit despite quality warnings, provide a detailed reason.
                    This will be logged for audit purposes.
                  </p>
                </div>

                <div>
                  <Label htmlFor="override-reason">
                    Override Reason (minimum 20 characters) *
                  </Label>
                  <Textarea
                    id="override-reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why this submission should proceed despite quality warnings..."
                    required
                    minLength={20}
                    data-testid="override-reason"
                    aria-label="Override reason"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {overrideReason.length}/20 minimum
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onGoBack}
                    data-testid="btn-go-back"
                  >
                    Go Back & Edit
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={isSubmitting || overrideReason.trim().length < 20}
                    data-testid="btn-submit-anyway"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Anyway'}
                  </Button>
                </div>
              </form>
            )}

            {/* Ready to submit (score >= 75) */}
            {quality_assessment.threshold_met && (
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="btn-close"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={onGoBack}
                  data-testid="btn-proceed"
                >
                  Proceed with Submission
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
