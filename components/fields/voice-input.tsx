'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  language?: string;
  continuous?: boolean;
  className?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
  buttonVariant?: 'default' | 'outline' | 'ghost';
}

/**
 * Voice Input Component
 * 
 * Speech-to-text input for mobile users using Web Speech API
 * 
 * @example
 * ```tsx
 * <VoiceInput
 *   onTranscript={(text) => {
 *     setFormData({ ...formData, description: text });
 *   }}
 *   onError={(error) => {
 *     console.error('Voice input error:', error);
 *   }}
 *   continuous={false}
 * />
 * ```
 */
export function VoiceInput({
  onTranscript,
  onError,
  disabled = false,
  language = 'en-GB',
  continuous = false,
  className,
  buttonSize = 'sm',
  buttonVariant = 'outline',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if Speech Recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;

        recognition.continuous = continuous;
        recognition.interimResults = false;
        recognition.lang = language;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(' ');

          onTranscript(transcript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          let errorMessage = 'Speech recognition error';

          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try again.';
              break;
            case 'audio-capture':
              errorMessage = 'Microphone not accessible. Please check permissions.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone permission denied. Please enable in browser settings.';
              break;
            case 'network':
              errorMessage = 'Network error. Please check your connection.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }

          setError(errorMessage);
          onError?.(errorMessage);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };
      } else {
        setIsSupported(false);
        setError('Speech recognition not supported in this browser');
      }
    }
  }, [language, continuous, onTranscript, onError]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabled || !isSupported) return;

    try {
      setError(null);
      setIsListening(true);
      recognitionRef.current.start();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
    }
  }, [disabled, isSupported, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <div className={cn('inline-flex', className)}>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          'relative',
          isListening && 'bg-red-500 hover:bg-red-600 text-white'
        )}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        aria-pressed={isListening}
      >
        {isListening ? (
          <>
            <MicOff className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Stop</span>
            {/* Pulsing animation */}
            <span className="absolute inset-0 rounded-md bg-red-500 animate-ping opacity-75" />
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Voice</span>
          </>
        )}
      </Button>

      {error && (
        <div className="absolute top-full mt-1 left-0 bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700 z-50 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

