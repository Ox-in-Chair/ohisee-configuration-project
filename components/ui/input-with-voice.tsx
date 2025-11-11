'use client';

import { FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceInput } from '@/components/fields/voice-input';
import { TextToSpeech } from '@/components/fields/text-to-speech';
import { cn } from '@/lib/utils';

export interface InputWithVoiceProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  enableVoiceInput?: boolean;
  enableTextToSpeech?: boolean;
  onVoiceTranscript?: (text: string) => void;
}

/**
 * Input component with integrated voice input and text-to-speech
 * 
 * Wraps the base Input component with voice functionality
 * 
 * @example
 * ```tsx
 * <InputWithVoice
 *   label="Product Name"
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 *   enableVoiceInput={true}
 *   enableTextToSpeech={true}
 * />
 * ```
 */
export const InputWithVoice: FC<InputWithVoiceProps> = ({
  label,
  enableVoiceInput = true,
  enableTextToSpeech = true,
  onVoiceTranscript,
  value,
  onChange,
  className,
  disabled,
  ...props
}) => {
  const [inputValue, setInputValue] = useState<string>(
    typeof value === 'string' ? value : ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(e);
  };

  const handleVoiceTranscript = (transcript: string) => {
    const newValue = transcript;
    setInputValue(newValue);
    // Create synthetic event for onChange
    const syntheticEvent = {
      target: { value: newValue },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(syntheticEvent);
    onVoiceTranscript?.(transcript);
  };

  // Sync with external value changes
  if (typeof value === 'string' && value !== inputValue) {
    setInputValue(value);
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <Input
          {...props}
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn('flex-1', className)}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          {enableVoiceInput && (
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={disabled}
              buttonSize="sm"
              buttonVariant="outline"
            />
          )}
          {enableTextToSpeech && inputValue && inputValue.trim().length > 0 && (
            <TextToSpeech
              text={inputValue}
              disabled={disabled}
              buttonSize="sm"
              buttonVariant="outline"
            />
          )}
        </div>
      </div>
    </div>
  );
};

