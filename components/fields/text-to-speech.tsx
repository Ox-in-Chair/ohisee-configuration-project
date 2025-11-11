'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextToSpeechProps {
  text: string;
  language?: string;
  disabled?: boolean;
  className?: string;
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';
  buttonVariant?: 'default' | 'outline' | 'ghost';
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onEnd?: () => void;
  onQualityCheck?: () => Promise<{ score: number; suggestions: string[] }>; // Quality check function to trigger after playback
  rate?: number; // Speech rate (0.1 to 10, default: 1)
  pitch?: number; // Speech pitch (0 to 2, default: 1)
  volume?: number; // Speech volume (0 to 1, default: 1)
}

/**
 * Text-to-Speech Component
 * 
 * Provides text-to-speech playback using Web Speech Synthesis API
 * 
 * @example
 * ```tsx
 * <TextToSpeech
 *   text="This is the text to be read aloud"
 *   language="en-GB"
 *   onEnd={() => console.log('Playback finished')}
 * />
 * ```
 */
export function TextToSpeech({
  text,
  language = 'en-GB',
  disabled = false,
  className,
  buttonSize = 'sm' as const,
  buttonVariant = 'outline',
  onPlay,
  onPause,
  onStop,
  onEnd,
  onQualityCheck,
  rate = 1,
  pitch = 1,
  volume = 1,
}: TextToSpeechProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check if Speech Synthesis is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      synthRef.current = window.speechSynthesis;
    } else {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current && isPlaying) {
        synthRef.current.cancel();
      }
    };
  }, [isPlaying]);

  // Play text
  const play = useCallback(() => {
    if (!synthRef.current || !text || disabled || !isSupported) return;

    // Cancel any existing speech
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = Math.max(0.1, Math.min(10, rate));
    utterance.pitch = Math.max(0, Math.min(2, pitch));
    utterance.volume = Math.max(0, Math.min(1, volume));

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      onPlay?.();
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
      onEnd?.();
      // Automatically trigger quality check after text-to-speech playback if enabled
      if (onQualityCheck && text.trim().length > 0) {
        // Trigger quality check after a short delay
        setTimeout(() => {
          onQualityCheck().catch((err) => {
            console.error('Quality check failed after text-to-speech:', err);
          });
        }, 500);
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [text, language, disabled, isSupported, rate, pitch, volume, onPlay, onEnd]);

  // Pause speech
  const pause = useCallback(() => {
    if (!synthRef.current || !isPlaying) return;

    if (synthRef.current.speaking && !synthRef.current.paused) {
      synthRef.current.pause();
      setIsPaused(true);
      onPause?.();
    }
  }, [isPlaying, onPause]);

  // Resume speech
  const resume = useCallback(() => {
    if (!synthRef.current || !isPaused) return;

    if (synthRef.current.paused) {
      synthRef.current.resume();
      setIsPaused(false);
      onPlay?.();
    }
  }, [isPaused, onPlay]);

  // Stop speech
  const stop = useCallback(() => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    utteranceRef.current = null;
    onStop?.();
  }, [onStop]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      play();
    }
  }, [isPlaying, isPaused, play, pause, resume]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  if (!text || text.trim().length === 0) {
    return null; // Don't render if no text
  }

  return (
    <div className={cn('inline-flex gap-2', className)}>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={togglePlayPause}
        disabled={disabled || !text || text.trim().length === 0}
        className={cn(
          'relative',
          isPlaying && !isPaused && 'bg-blue-500 hover:bg-blue-600 text-white'
        )}
        aria-label={isPlaying && !isPaused ? 'Pause playback' : isPaused ? 'Resume playback' : 'Play text'}
        aria-pressed={isPlaying}
      >
        {isPlaying && !isPaused ? (
          <>
            <Pause className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Pause</span>
          </>
        ) : isPaused ? (
          <>
            <Play className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Resume</span>
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Listen</span>
          </>
        )}
      </Button>

      {isPlaying && (
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          onClick={stop}
          disabled={disabled}
          aria-label="Stop playback"
        >
          <Square className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Stop</span>
        </Button>
      )}
    </div>
  );
}

