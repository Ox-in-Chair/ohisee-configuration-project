import { FC, useState, useCallback, ChangeEvent, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { QualityIndicator } from '@/components/quality-indicator';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { getRequirementChecklist } from '@/lib/validations/quality-messages';
import { cn } from '@/lib/utils';
import { VoiceInput } from '@/components/fields/voice-input';
import { TextToSpeech } from '@/components/fields/text-to-speech';
import { RewriteAssistant } from '@/components/fields/rewrite-assistant';

/**
 * EnhancedTextarea Props Interface
 */
export interface EnhancedTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGetHelp?: (() => void) | undefined;
  qualityScore?: (number | null) | undefined;
  isCheckingQuality?: boolean | undefined;
  isProcessing?: boolean | undefined;
  showQualityBadge?: boolean | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
  rows?: number | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  'data-testid'?: string | undefined;
  error?: string | undefined;
  fieldName?: string | undefined; // For requirement checklist (e.g., 'nc_description', 'root_cause_analysis')
  context?: { ncType?: string | undefined } | undefined; // Context for adaptive placeholders and checklists
  showChecklist?: boolean | undefined; // Show live requirement checklist
  enableVoiceInput?: boolean | undefined; // Enable voice input (default: true)
  enableTextToSpeech?: boolean | undefined; // Enable text-to-speech (default: true)
  enableRewrite?: boolean | undefined; // Enable rewrite assistant (default: false)
  onQualityCheck?: (() => Promise<{ score: number; suggestions: string[] }>) | undefined; // Quality check function for rewrite
}

/**
 * Enhanced Textarea Component with Quality Validation
 *
 * Textarea with integrated quality feedback and writing assistance button
 * Shows character counter, quality indicator, and "Get Help" button
 *
 * @example
 * ```tsx
 * <EnhancedTextarea
 *   label="Corrective Action"
 *   value={formData.corrective_action}
 *   onChange={(value) => setFormData({ ...formData, corrective_action: value })}
 *   onGetHelp={() => getWritingHelp(formData)}
 *   qualityScore={qualityScore?.score}
 *   isCheckingQuality={isChecking}
 *   showQualityBadge={true}
 *   minLength={50}
 *   required
 * />
 * ```
 */
export const EnhancedTextarea: FC<EnhancedTextareaProps> = ({
  label,
  value,
  onChange,
  onGetHelp,
  qualityScore = null,
  isCheckingQuality = false,
  isProcessing = false,
  showQualityBadge = true,
  minLength = 0,
  maxLength = 2000,
  rows = 5,
  required = false,
  placeholder,
  disabled = false,
  'data-testid': testId,
  error,
  fieldName,
  context,
  showChecklist = false,
  enableVoiceInput = true,
  enableTextToSpeech = true,
  enableRewrite = false,
  onQualityCheck,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Generate adaptive placeholder based on field and context
  const adaptivePlaceholder = useMemo(() => {
    if (placeholder) return placeholder; // Use provided placeholder if available

    if (fieldName === 'nc_description' && context?.ncType) {
      const minLengths: Record<string, number> = {
        'raw-material': 120,
        'finished-goods': 150,
        'wip': 130,
        'incident': 200,
        'other': 100,
      };
      const requiredMin = minLengths[context.ncType] || 100;
      return `Include: what happened, when (time if incident), where (location), quantity affected, batch/carton numbers (if applicable), and immediate actions taken. Minimum ${requiredMin} characters.`;
    }

    if (fieldName === 'root_cause_analysis') {
      return 'Use the 5-Why method. E.g., Why did this happen? → [initial cause]. Why? → [deeper cause]... (aim for 3-5 layers) to identify the true root cause.';
    }

    if (fieldName === 'corrective_action') {
      return 'Describe specific actions: immediate fixes and long-term preventive measures. Reference procedures (e.g., "as per SOP 5.7") and include how and when you will verify effectiveness.';
    }

    return placeholder || '';
  }, [placeholder, fieldName, context]);

  // Get requirement checklist for this field
  const checklist = useMemo(() => {
    if (!showChecklist || !fieldName || !value) return [];
    return getRequirementChecklist(fieldName, value, context);
  }, [showChecklist, fieldName, value, context]);

  // Calculate dynamic minimum based on context
  const dynamicMinLength = useMemo(() => {
    if (fieldName === 'nc_description' && context?.ncType) {
      const minLengths: Record<string, number> = {
        'raw-material': 120,
        'finished-goods': 150,
        'wip': 130,
        'incident': 200,
        'other': 100,
      };
      return minLengths[context.ncType] || minLength;
    }
    return minLength;
  }, [fieldName, context, minLength]);

  // Handle textarea change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Calculate character count status
  const getCharacterCountColor = (): string => {
    if (value.length >= dynamicMinLength) return 'text-green-600';
    if (value.length >= dynamicMinLength / 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const showMinimumNotMet = dynamicMinLength > 0 && value.length < dynamicMinLength;

  return (
    <div className="space-y-2">
      {/* Label with Get Help and Voice Input buttons */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        <div className="flex items-center gap-2">
          {/* Voice Input (mobile-friendly) */}
          {enableVoiceInput && (
            <VoiceInput
              onTranscript={(text) => {
                // Append transcribed text to existing value
                const newValue = value ? `${value} ${text}` : text;
                onChange(newValue);
                // Automatically trigger quality check after voice input if quality check is enabled
                if (enableRewrite && onQualityCheck && newValue.trim().length > 0) {
                  // Trigger quality check after a short delay to allow state to update
                  setTimeout(() => {
                    onQualityCheck().catch((err) => {
                      console.error('Quality check failed after voice input:', err);
                    });
                  }, 500);
                }
              }}
              disabled={disabled}
              className="hidden sm:inline-flex"
            />
          )}

          {/* Text-to-Speech */}
          {enableTextToSpeech && value && value.trim().length > 0 && (
            <TextToSpeech
              text={value}
              disabled={disabled}
              buttonSize="sm"
              buttonVariant="outline"
              className="hidden sm:inline-flex"
              {...(enableRewrite && onQualityCheck ? {
                onQualityCheck: () => onQualityCheck()
              } : {})}
            />
          )}

          {onGetHelp && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGetHelp}
              disabled={isProcessing || disabled}
              className="flex items-center gap-2 text-xs"
              data-testid={`${testId}-get-help`}
              title="Get writing assistance based on procedures"
            >
              {isProcessing ? (
                <>
                  <Icon name={ICONS.LOADING} size="xs" className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Icon name={ICONS.HELP} size="xs" />
                  <span>Get Help</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Textarea with Voice Input (mobile) */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={rows}
          placeholder={adaptivePlaceholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          data-testid={testId}
          className={cn(
            'transition-smooth focus-glow',
            isFocused ? 'ring-2 ring-blue-200 shadow-sm' : '',
            error ? 'border-red-500' : ''
          )}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${testId}-error` : undefined}
        />
        {/* Mobile Voice Input and Text-to-Speech (shown on small screens) */}
        {enableVoiceInput && (
          <div className="absolute bottom-2 right-2 sm:hidden flex items-center gap-1">
            <VoiceInput
              onTranscript={(text) => {
                const newValue = value ? `${value} ${text}` : text;
                onChange(newValue);
                // Automatically trigger quality check after voice input if quality check is enabled
                if (enableRewrite && onQualityCheck && newValue.trim().length > 0) {
                  // Trigger quality check after a short delay to allow state to update
                  setTimeout(() => {
                    onQualityCheck().catch((err) => {
                      console.error('Quality check failed after voice input:', err);
                    });
                  }, 500);
                }
              }}
              disabled={disabled}
              buttonSize="sm"
              buttonVariant="ghost"
            />
            {enableTextToSpeech && value && value.trim().length > 0 && (
              <TextToSpeech
                text={value}
                disabled={disabled}
                buttonSize="sm"
                buttonVariant="ghost"
                {...(enableRewrite && onQualityCheck ? {
                  onQualityCheck: () => onQualityCheck()
                } : {})}
              />
            )}
          </div>
        )}
      </div>

      {/* Live Requirement Checklist */}
      {showChecklist && checklist.length > 0 && (
        <div
          className="mt-2 space-y-1.5 text-xs"
          role="list"
          aria-live="polite"
          aria-label="Requirement checklist"
          data-testid={`${testId}-checklist`}
        >
          {checklist.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 transition-opacity duration-150 ${
                item.checked ? 'opacity-100' : 'opacity-70'
              }`}
            >
              {item.checked ? (
                <Icon name={ICONS.SUCCESS} size={14} className="text-green-600 flex-shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              <span
                className={
                  item.checked
                    ? 'text-green-700 line-through'
                    : item.required
                      ? 'text-gray-700 font-medium'
                      : 'text-gray-600'
                }
              >
                {item.label}
                {item.required && !item.checked && (
                  <span className="text-red-600 ml-1">*</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: Character counter, quality indicator, error */}
      <div className="flex items-center justify-between gap-4">
        {/* Character counter */}
        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${getCharacterCountColor()}`}
            data-testid={`${testId}-char-count`}
          >
            {value.length} / {dynamicMinLength} minimum
            {dynamicMinLength !== minLength && fieldName === 'nc_description' && context?.ncType && (
              <span className="text-xs text-gray-500 ml-1">
                (for {context.ncType.replace('-', ' ')})
              </span>
            )}
            {maxLength && ` (${maxLength} max)`}
          </span>

          {showMinimumNotMet && (
            <span className="text-xs text-red-600" data-testid={`${testId}-minimum-warning`}>
              {dynamicMinLength - value.length} characters needed
            </span>
          )}
        </div>

        {/* Quality indicator */}
        {showQualityBadge && (
          <QualityIndicator
            score={qualityScore}
            isChecking={isCheckingQuality}
            threshold={75}
            showDetails={false}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600" id={`${testId}-error`} data-testid={`${testId}-error`}>
          {error}
        </p>
      )}

      {/* Rewrite Assistant */}
      {enableRewrite && value && value.trim().length > 0 && (
        <div className="mt-2">
          <RewriteAssistant
            currentText={value}
            onRewrite={(improvedText) => onChange(improvedText)}
            {...(onQualityCheck ? { onQualityCheck } : {})}
            qualityScore={qualityScore}
            isCheckingQuality={isCheckingQuality}
            disabled={disabled}
            buttonSize="sm"
            buttonVariant="outline"
          />
        </div>
      )}
    </div>
  );
};

