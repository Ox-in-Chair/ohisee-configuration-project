import { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';

/**
 * AIQualityBadge Props Interface
 */
export interface AIQualityBadgeProps {
  score: number | null;
  isChecking?: boolean;
  threshold?: number;
  showDetails?: boolean;
}

/**
 * AI Quality Badge Component
 *
 * Displays quality score with color-coded visual feedback
 * - Green (>=75): Meets threshold
 * - Yellow (60-74): Warning
 * - Red (<60): Below threshold
 *
 * @example
 * ```tsx
 * <AIQualityBadge score={82} threshold={75} showDetails={true} />
 * ```
 */
export const AIQualityBadge: FC<AIQualityBadgeProps> = ({
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
        data-testid="quality-badge-loading"
      >
        <Icon name={ICONS.LOADING} size="xs" className="animate-spin" />
        <span>Checking quality...</span>
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
    if (score >= threshold) return <Icon name={ICONS.SUCCESS} size="xs" />;
    if (score >= 60) return <Icon name={ICONS.WARNING} size="xs" />;
    return <Icon name={ICONS.ERROR} size="xs" />;
  };

  const getMessage = (): string => {
    if (score >= threshold) return 'Excellent quality';
    if (score >= 60) return 'Needs improvement';
    return 'Below threshold';
  };

  const variant = getVariant();

  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant={variant}
        className="flex items-center gap-2 w-fit"
        data-testid="quality-badge"
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
