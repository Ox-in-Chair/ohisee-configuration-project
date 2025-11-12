import { FC, useState, useCallback, ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AIQualityBadge } from '@/components/ai-quality-badge';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';

/**
 * AIEnhancedTextarea Props Interface
 */
export interface AIEnhancedTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKangopakCore?: (() => void) | undefined;
  qualityScore?: (  null) | undefined;
  isCheckingQuality?: boolean | undefined;
  isSuggesting?: boolean | undefined;
  showQualityBadge?: boolean | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  rows?: number | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  'data-testid'?: string | undefined;
  error?: string | undefined;
}

/**
 * Enhanced Textarea Component with Kangopak Core Integration
 *
 * Textarea with integrated quality feedback and Kangopak Core assistance button
 * Shows character counter, quality badge, and "Kangopak Core" button
 *
 * @example
 * ```tsx
 * <AIEnhancedTextarea
 *   label="Corrective Action"
 *   value={formData.corrective_action}
 *   onChange={(value) => setFormData({ ...formData, corrective_action: value })}
 *   onKangopakCore={() => generateSuggestion(formData)}
 *   qualityScore={qualityScore?.score}
 *   isCheckingQuality={isChecking}
 *   showQualityBadge={true}
 *   minLength={50}
 *   required
 * />
 * ```
 */
export const AIEnhancedTextarea: FC<AIEnhancedTextareaProps> = ({
  label,
  value,
  onChange,
  onKangopakCore,
  qualityScore = null,
  isCheckingQuality = false,
  isSuggesting = false,
  showQualityBadge = true,
  minLength = 0,
  maxLength = 2000,
  rows = 5,
  required = false,
  placeholder,
  disabled = false,
  'data-testid': testId,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Handle textarea change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Calculate character count status
  const getCharacterCountColor = (): string => {
    if (value.length >= minLength) return 'text-green-600';
    if (value.length >= minLength / 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const showMinimumNotMet = minLength > 0 && value.length < minLength;

  return (
    <div className="space-y-2">
      {/* Label with Kangopak Core button */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label}
          {required ? <span className="text-red-500 ml-1">*</span> : null}
        </Label>

        {onKangopakCore ? <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onKangopakCore}
            disabled={isSuggesting || disabled}
            className="flex items-center gap-2 text-xs"
            data-testid={`${testId}-ai-help`}
            title="Get assistance from Kangopak Core knowledge base"
          >
            {isSuggesting ? (
              <>
                <Icon name={ICONS.LOADING} size="xs" className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Icon name={ICONS.SPARKLES} size="xs" />
                <span>Kangopak Core</span>
              </>
            )}
          </Button> : null}
      </div>

      {/* Textarea */}
      <Textarea
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        data-testid={testId}
        className={`${isFocused ? 'ring-2 ring-blue-200' : ''} ${
          error ? 'border-red-500' : ''
        }`}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? `${testId}-error` : undefined}
      />

      {/* Footer: Character counter, quality badge, error */}
      <div className="flex items-center justify-between gap-4">
        {/* Character counter */}
        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${getCharacterCountColor()}`}
            data-testid={`${testId}-char-count`}
          >
            {value.length} / {minLength} minimum
            {maxLength ? ` (${maxLength} max)` : null}
          </span>

          {showMinimumNotMet ? <span className="text-xs text-red-600" data-testid={`${testId}-minimum-warning`}>
              {minLength - value.length} characters needed
            </span> : null}
        </div>

        {/* Quality badge */}
        {showQualityBadge ? <AIQualityBadge
            score={qualityScore}
            isChecking={isCheckingQuality}
            threshold={75}
            showDetails={false}
          /> : null}
      </div>

      {/* Error message */}
      {error ? <p className="text-sm text-red-600" id={`${testId}-error`} data-testid={`${testId}-error`}>
          {error}
        </p> : null}
    </div>
  );
};
