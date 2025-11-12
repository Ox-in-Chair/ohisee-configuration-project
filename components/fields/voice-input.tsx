'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { cn } from '@/lib/utils';

export interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  language?: string;
  continuous?: boolean;
  className?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';
  buttonVariant?: 'default' | 'outline' | 'ghost';
  timeout?: number; // Timeout in milliseconds (default: 60000 = 60 seconds, max: 300000 = 5 minutes)
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
  continuous = true, // Default to true to prevent mid-sentence cutoffs
  className,
  buttonSize = 'sm' as const,
  buttonVariant = 'outline',
  timeout = 60000, // Default 60 seconds, configurable up to 5 minutes
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());

  // Check if Speech Recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        if (!recognition) return;

        recognition.continuous = continuous;
        recognition.interimResults = true; // Enable interim results to show real-time transcription
        recognition.lang = language;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          // Update last speech time to detect if user is still speaking
          lastSpeechTimeRef.current = Date.now();

          // Get all results (interim and final)
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(' ');

          // Only call onTranscript with final results to avoid too many updates
          const finalTranscript = Array.from(event.results)
            .filter((result) => result.isFinal)
            .map((result) => result[0].transcript)
            .join(' ');

          if (finalTranscript) {
            onTranscript(finalTranscript);
          }
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
          // Check if user was speaking recently (within last 2 seconds)
          const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
          const stillSpeaking = timeSinceLastSpeech < 2000;

          if (stillSpeaking && isListening) {
            // User is still speaking, restart recognition
            try {
              recognition.start();
            } catch (err) {
              // Recognition already started or error, just update state
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }

          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        };
      } else {
        setIsSupported(false);
        setError('Speech recognition not supported in this browser');
      }
    }
  }, [language, continuous, onTranscript, onError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabled || !isSupported) return;

    try {
      setError(null);
      setIsListening(true);
      lastSpeechTimeRef.current = Date.now();
      recognitionRef.current.start();

      // Set timeout to stop listening after specified duration
      // Clamp timeout between 10 seconds and 5 minutes
      const clampedTimeout = Math.max(10000, Math.min(300000, timeout));
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
          setIsListening(false);
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, clampedTimeout);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [disabled, isSupported, onError, timeout, isListening]);

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
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
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
            <Icon name={ICONS.MIC_OFF} size="sm" className="mr-2" />
            <span className="hidden sm:inline">Stop</span>
            {/* Pulsing animation */}
            <span className="absolute inset-0 rounded-md bg-red-500 animate-ping opacity-75" />
          </>
        ) : (
          <>
            <Icon name={ICONS.MIC_ON} size="sm" className="mr-2" />
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
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

