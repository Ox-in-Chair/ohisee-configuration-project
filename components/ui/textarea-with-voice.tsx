'use client';

import { FC, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { VoiceInput } from '@/components/fields/voice-input';
import { TextToSpeech } from '@/components/fields/text-to-speech';
import { cn } from '@/lib/utils';

export interface TextareaWithVoiceProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  enableVoiceInput?: boolean;
  enableTextToSpeech?: boolean;
  onVoiceTranscript?: (text: string) => void;
}

/**
 * Textarea component with integrated voice input and text-to-speech
 * 
 * Wraps the base Textarea component with voice functionality
 * 
 * @example
 * ```tsx
 * <TextareaWithVoice
 *   label="Description"
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 *   enableVoiceInput={true}
 *   enableTextToSpeech={true}
 * />
 * ```
 */
export const TextareaWithVoice: FC<TextareaWithVoiceProps> = ({
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
  const [textareaValue, setTextareaValue] = useState<string>(
    typeof value === 'string' ? value : ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setTextareaValue(newValue);
    onChange?.(e);
  };

  const handleVoiceTranscript = (transcript: string) => {
    // Append transcribed text to existing value
    const newValue = textareaValue ? `${textareaValue} ${transcript}` : transcript;
    setTextareaValue(newValue);
    // Create synthetic event for onChange
    const syntheticEvent = {
      target: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange?.(syntheticEvent);
    onVoiceTranscript?.(transcript);
  };

  // Sync with external value changes
  if (typeof value === 'string' && value !== textareaValue) {
    setTextareaValue(value);
  }

  return (
    <div className="space-y-2">
      {label ? <Label className="text-sm font-medium">
          {label}
          {props.required ? <span className="text-red-500 ml-1">*</span> : null}
        </Label> : null}
      <div className="relative">
        <Textarea
          {...props}
          value={textareaValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn('pr-20', className)}
        />
        {/* Voice Input and Text-to-Speech buttons */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {enableVoiceInput ? <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={disabled}
              buttonSize="sm"
              buttonVariant="ghost"
            /> : null}
          {enableTextToSpeech && textareaValue && textareaValue.trim().length > 0 ? <TextToSpeech
              text={textareaValue}
              disabled={disabled}
              buttonSize="sm"
              buttonVariant="ghost"
            /> : null}
        </div>
      </div>
    </div>
  );
};

