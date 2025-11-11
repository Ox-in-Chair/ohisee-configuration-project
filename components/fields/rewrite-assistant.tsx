'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RewriteAssistantProps {
  currentText: string;
  onRewrite: (improvedText: string) => void;
  onQualityCheck?: () => Promise<{ score: number; suggestions: string[] }>;
  qualityScore?: number | null;
  isCheckingQuality?: boolean;
  disabled?: boolean;
  className?: string;
  buttonSize?: 'default' | 'sm' | 'lg';
  buttonVariant?: 'default' | 'outline' | 'ghost';
  qualityThreshold?: number; // Minimum quality score to show rewrite button (default: 70)
}

/**
 * Rewrite Assistant Component
 * 
 * Provides "Rewrite for Better Quality" functionality after text-to-speech playback
 * Integrates with AI quality validation system
 * 
 * @example
 * ```tsx
 * <RewriteAssistant
 *   currentText={formData.description}
 *   onRewrite={(improvedText) => setFormData({ ...formData, description: improvedText })}
 *   onQualityCheck={async () => await checkQuality(formData.description)}
 *   qualityScore={qualityScore}
 *   isCheckingQuality={isChecking}
 * />
 * ```
 */
export function RewriteAssistant({
  currentText,
  onRewrite,
  onQualityCheck,
  qualityScore = null,
  isCheckingQuality = false,
  disabled = false,
  className,
  buttonSize = 'sm',
  buttonVariant = 'outline',
  qualityThreshold = 70,
}: RewriteAssistantProps) {
  const [isRewriting, setIsRewriting] = useState(false);
  const [showRewriteButton, setShowRewriteButton] = useState(false);

  // Check quality and show rewrite button if needed
  const checkQualityAndShowRewrite = useCallback(async () => {
    if (!onQualityCheck || !currentText || currentText.trim().length === 0) {
      return;
    }

    try {
      const result = await onQualityCheck();
      if (result.score < qualityThreshold) {
        setShowRewriteButton(true);
      } else {
        setShowRewriteButton(false);
      }
    } catch (error) {
      console.error('Quality check failed:', error);
      // Show rewrite button anyway if quality check fails
      setShowRewriteButton(true);
    }
  }, [onQualityCheck, currentText, qualityThreshold]);

  // Handle rewrite button click
  const handleRewrite = useCallback(async () => {
    if (!currentText || currentText.trim().length === 0 || isRewriting) return;

    setIsRewriting(true);
    setShowRewriteButton(false);

    try {
      // Call AI service to improve the text
      // This would typically call an AI API endpoint
      // For now, we'll use a placeholder that the parent component should implement
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentText,
          context: 'nca_description', // Could be passed as prop
        }),
      });

      if (!response.ok) {
        throw new Error('Rewrite failed');
      }

      const data = await response.json();
      onRewrite(data.improvedText || currentText);
    } catch (error) {
      console.error('Rewrite failed:', error);
      // On error, don't change the text
    } finally {
      setIsRewriting(false);
    }
  }, [currentText, isRewriting, onRewrite]);

  // Auto-check quality when quality score changes
  useEffect(() => {
    if (qualityScore !== null && qualityScore < qualityThreshold) {
      setShowRewriteButton(true);
    } else if (qualityScore !== null && qualityScore >= qualityThreshold) {
      setShowRewriteButton(false);
    }
  }, [qualityScore, qualityThreshold]);

  // Don't render if no text or disabled
  if (!currentText || currentText.trim().length === 0 || disabled) {
    return null;
  }

  // Show rewrite button if quality is below threshold or if explicitly shown
  const shouldShow = showRewriteButton || (qualityScore !== null && qualityScore < qualityThreshold);

  if (!shouldShow && !isCheckingQuality) {
    return null;
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {isCheckingQuality ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking quality...</span>
        </div>
      ) : shouldShow ? (
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          onClick={handleRewrite}
          disabled={isRewriting || disabled}
          className="flex items-center gap-2"
          aria-label="Rewrite for better quality"
        >
          {isRewriting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Rewriting...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Rewrite for Better Quality</span>
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

