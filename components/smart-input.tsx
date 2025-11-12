'use client';

import { FC, useState, useCallback, ChangeEvent, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { cn } from '@/lib/utils';
import { createPackagingSafetyService } from '@/lib/knowledge/packaging-safety-service';
import { createIndustryBenchmarksService } from '@/lib/knowledge/industry-benchmarks-service';
import type { PackagingMaterial } from '@/lib/knowledge/packaging-safety-service';
import { VoiceInput } from '@/components/fields/voice-input';
import { TextToSpeech } from '@/components/fields/text-to-speech';
import { RewriteAssistant } from '@/components/fields/rewrite-assistant';

// Constant empty array to prevent recreation on every render
const EMPTY_SUGGESTIONS: string[] = [];

/**
 * SmartInput Props Interface
 */
export interface SmartInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGetHelp?: () => void;
  isProcessing?: boolean;
  required?: boolean;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  'data-testid'?: string | undefined;
  error?: string | undefined;
  fieldName?: string | undefined; // For field-specific features (e.g., 'nc_product_description', 'supplier_name')
  type?: ('text' | 'email' | 'tel' | 'url') | undefined;
  showSuggestions?: boolean | undefined; // Show autocomplete suggestions
  suggestions?: string[] | undefined; // External suggestions (e.g., from AI)
  tooltip?: React.ReactNode | undefined; // Optional tooltip component to display next to label
  enableVoiceInput?: boolean | undefined; // Enable voice input (default: true)
  enableTextToSpeech?: boolean | undefined; // Enable text-to-speech (default: true)
  enableRewrite?: boolean | undefined; // Enable rewrite assistant (default: false)
  onQualityCheck?: (() => Promise<{ score: number; suggestions: string[] }>) | undefined; // Quality check function for rewrite
  qualityScore?: (number | null) | undefined; // Current quality score
  isCheckingQuality?: boolean | undefined; // Is quality check in progress
}

/**
 * Smart Input Component with AI-powered autocomplete and suggestions
 *
 * Features:
 * - Context-aware autocomplete
 * - Packaging material lookup (for product description fields)
 * - Supplier suggestions (for supplier fields)
 * - Real-time validation
 * - Smart formatting
 *
 * @example
 * ```tsx
 * <SmartInput
 *   label="Product Description"
 *   value={formData.nc_product_description}
 *   onChange={(value) => setFormData({ ...formData, nc_product_description: value })}
 *   fieldName="nc_product_description"
 *   showSuggestions={true}
 * />
 * ```
 */
export const SmartInput: FC<SmartInputProps> = ({
  label,
  value,
  onChange,
  onGetHelp,
  isProcessing = false,
  required = false,
  placeholder,
  disabled = false,
  'data-testid': testId,
  error,
  fieldName,
  type = 'text',
  showSuggestions = false,
  suggestions: externalSuggestions = EMPTY_SUGGESTIONS,
  tooltip,
  enableVoiceInput = true,
  enableTextToSpeech = true,
  enableRewrite = false,
  onQualityCheck,
  qualityScore = null,
  isCheckingQuality = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingMaterial[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Memoize external suggestions based on content to prevent unnecessary re-renders
  const stableExternalSuggestions = useMemo(() => {
    return externalSuggestions;
  }, [JSON.stringify(externalSuggestions)]);

  // Use ref to track previous values and prevent infinite loops
  const prevValueRef = useRef<string>('');
  const prevFieldNameRef = useRef<string | undefined>(undefined);
  const prevIsFocusedRef = useRef<boolean>(false);

  // Clear suggestions when conditions aren't met (separate effect to avoid loop)
  useEffect(() => {
    if (!showSuggestions || !isFocused || !value || value.length < 2) {
      setAutocompleteSuggestions(prev => (prev.length > 0 ? [] : prev));
      setShowAutocomplete(prev => (prev ? false : prev));
    }
  }, [showSuggestions, isFocused, value]);

  // Load suggestions based on field type
  useEffect(() => {
    // Early return if conditions aren't met
    if (!showSuggestions || !isFocused || !value || value.length < 2) {
      return;
    }

    // Skip if values haven't actually changed
    if (
      prevValueRef.current === value &&
      prevFieldNameRef.current === fieldName &&
      prevIsFocusedRef.current === isFocused
    ) {
      return;
    }

    // Update refs
    prevValueRef.current = value;
    prevFieldNameRef.current = fieldName;
    prevIsFocusedRef.current = isFocused;

    const loadSuggestions = async () => {
      try {
        if (fieldName === 'nc_product_description') {
          // Search packaging materials
          const packagingService = createPackagingSafetyService();
          const materials = await packagingService.searchMaterials(value);
          setPackagingMaterials(materials);
          const newSuggestions = materials.map(m => `${m.material_code} - ${m.material_name}`);
          setAutocompleteSuggestions(newSuggestions);
          setShowAutocomplete(materials.length > 0);
        } else if (fieldName === 'supplier_name') {
          // TODO: Search suppliers from database
          // For now, use external suggestions
          setAutocompleteSuggestions(stableExternalSuggestions);
          setShowAutocomplete(stableExternalSuggestions.length > 0);
        } else {
          // Generic autocomplete from external suggestions
          setAutocompleteSuggestions(stableExternalSuggestions);
          setShowAutocomplete(stableExternalSuggestions.length > 0);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    };

    // Debounce
    const timeoutId = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [value, fieldName, showSuggestions, isFocused, stableExternalSuggestions]);

  // Handle input change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setSelectedSuggestionIndex(-1);
    },
    [onChange]
  );

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestion: string, index: number) => {
      if (fieldName === 'nc_product_description' && packagingMaterials[index]) {
        // Use material code for product description
        onChange(packagingMaterials[index].material_code);
      } else {
        // Use full suggestion text
        onChange(suggestion);
      }
      setShowAutocomplete(false);
      setSelectedSuggestionIndex(-1);
    },
    [fieldName, packagingMaterials, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showAutocomplete || autocompleteSuggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(autocompleteSuggestions[selectedSuggestionIndex], selectedSuggestionIndex);
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
      }
    },
    [showAutocomplete, autocompleteSuggestions, selectedSuggestionIndex, handleSelectSuggestion]
  );

  return (
    <div className="space-y-2 relative">
      {/* Label with Get Help button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {tooltip}
        </div>

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

      {/* Input with autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow suggestion click
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            data-testid={testId}
            className={cn(
              'transition-smooth focus-glow flex-1',
              isFocused ? 'ring-2 ring-blue-200 shadow-sm' : '',
              error ? 'border-red-500' : '',
              showAutocomplete && autocompleteSuggestions.length > 0 ? 'rounded-b-none' : ''
            )}
            aria-label={label}
            aria-invalid={!!error}
            aria-describedby={error ? `${testId}-error` : undefined}
            aria-autocomplete="list"
            aria-expanded={showAutocomplete}
          />
          {/* Voice Input and Text-to-Speech buttons */}
          <div className="flex items-center gap-1">
            {enableVoiceInput && (
              <VoiceInput
                onTranscript={(transcript) => {
                  onChange(transcript);
                  // Automatically trigger quality check after voice input if quality check is enabled
                  if (enableRewrite && onQualityCheck && transcript.trim().length > 0) {
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
                buttonVariant="outline"
                className="flex-shrink-0"
              />
            )}
            {enableTextToSpeech && value && value.trim().length > 0 && (
              <TextToSpeech
                text={value}
                disabled={disabled}
                buttonSize="sm"
                buttonVariant="outline"
                className="flex-shrink-0"
                onQualityCheck={
                  enableRewrite && onQualityCheck
                    ? () => onQualityCheck()
                    : undefined
                }
              />
            )}
          </div>
        </div>

        {/* Autocomplete suggestions dropdown */}
        {showAutocomplete && autocompleteSuggestions.length > 0 && isFocused && (
          <div
            className="absolute z-50 w-full mt-0 bg-surface border border-t-0 rounded-b-md shadow-lg max-h-60 overflow-auto animate-slide-in-from-top"
            role="listbox"
            aria-label="Suggestions"
          >
            {autocompleteSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion, index)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                  selectedSuggestionIndex === index ? 'bg-accent text-accent-foreground' : ''
                )}
                role="option"
                aria-selected={selectedSuggestionIndex === index}
              >
                {suggestion}
              </button>
            ))}
          </div>
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
            onQualityCheck={onQualityCheck}
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

