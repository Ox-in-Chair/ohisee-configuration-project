import { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

/**
 * QualityIndicator Props Interface
 */
export interface QualityIndicatorProps {
  score: number | null;
  isChecking?: boolean;
  threshold?: number;
  showDetails?: boolean;
}

/**
 * Quality Indicator Component
 *
 * Displays quality validation status with color-coded visual feedback
 * - Green (>=75): Meets requirements
 * - Yellow (60-74): Review recommended
 * - Red (<60): Incomplete
 *
 * @example
 * ```tsx
 * <QualityIndicator score={82} threshold={75} showDetails={true} />
 * ```
 */
export const QualityIndicator: FC<QualityIndicatorProps> = ({
  score,
  isChecking = false,
  threshold = 75,
  showDetails = false,
}) => {
  // Loading state
  if (isChecking) {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-2 bg-gray-50 text-gray-600"
        data-testid="quality-indicator-loading"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Validating...</span>
      </Badge>
    );
  }

  // No score yet
  if (score === null) {
    return null;
  }

  // Determine color and icon based on score
  const getVariant = (): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (score >= threshold) return 'default'; // Green
    if (score >= 60) return 'secondary'; // Yellow
    return 'destructive'; // Red
  };

  const getIcon = () => {
    if (score >= threshold) return <CheckCircle2 className="h-3 w-3" />;
    if (score >= 60) return <AlertCircle className="h-3 w-3" />;
    return <XCircle className="h-3 w-3" />;
  };

  const getMessage = (): string => {
    if (score >= threshold) return 'Meets requirements';
    if (score >= 60) return 'Review recommended';
    return 'Incomplete';
  };

  const variant = getVariant();

  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant={variant}
        className="flex items-center gap-2 w-fit"
        data-testid="quality-indicator"
        data-score={score}
      >
        {getIcon()}
        <span className="font-semibold">{score}/100</span>
        {showDetails && (
          <>
            <span className="mx-1">•</span>
            <span className="text-xs">{getMessage()}</span>
          </>
        )}
      </Badge>

      {/* Optional detailed breakdown */}
      {showDetails && score < threshold && (
        <p className="text-xs text-gray-600 mt-1">
          Threshold: {threshold}/100
          {score < threshold && (
            <span className="text-red-600 ml-2">
              ({threshold - score} points needed)
            </span>
          )}
        </p>
      )}
    </div>
  );
};

