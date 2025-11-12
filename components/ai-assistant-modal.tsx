'use client';

/**
 * AI Assistant Modal
 * Shows AI-generated suggestions with accept/reject options
 */

import { FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import type { Suggestion } from '@/lib/ai/types';

/**
 * AI Assistant Modal Props
 */
export interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (suggestionText: string) => void;
  onReject: () => void;
  suggestion: Suggestion | null;
  isLoading?: boolean;
}

/**
 * AI Assistant Modal Component
 *
 * Displays AI-generated suggestions with context and procedure references
 *
 * @example
 * ```tsx
 * <AIAssistantModal
 *   isOpen={showSuggestion}
 *   onClose={() => setShowSuggestion(false)}
 *   onAccept={(text) => handleAcceptSuggestion(text)}
 *   onReject={handleRejectSuggestion}
 *   suggestion={aiSuggestion}
 * />
 * ```
 */
export const AIAssistantModal: FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onReject,
  suggestion,
  isLoading = false,
}) => {
  if (!suggestion && !isLoading) return null;

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion.text);
    }
  };

  const getConfidenceColor = (confidence: string): string => {
    if (confidence === 'high') return 'bg-green-100 text-green-800';
    if (confidence === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: string): string => {
    if (confidence === 'high') return 'High Confidence';
    if (confidence === 'medium') return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="ai-assistant-modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Icon name={ICONS.SPARKLES} size="lg" className="text-blue-600" />
            <DialogTitle className="text-xl">AI Assistant Suggestion</DialogTitle>
          </div>
          <DialogDescription>
            Review the AI-generated suggestion below and decide whether to use it.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="ml-4 text-gray-600">Generating suggestion...</p>
          </div>
        ) : suggestion ? (
          <div className="space-y-4">
            {/* Confidence Badge */}
            <div className="flex items-center gap-2">
              <Badge className={getConfidenceColor(suggestion.confidence)}>
                {getConfidenceLabel(suggestion.confidence)} ({suggestion.confidence_percentage}%)
              </Badge>
              <Badge variant="outline" className="text-xs">
                Quality Score: {suggestion.quality_score}/100
              </Badge>
            </div>

            {/* Suggestion Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Suggested Text:</p>
              <p className="text-gray-800 whitespace-pre-wrap">{suggestion.text}</p>
            </div>

            {/* Recommendations */}
            {suggestion.recommendations && Object.keys(suggestion.recommendations).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Icon name={ICONS.WARNING} size="md" className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-2">
                      Additional Recommendations:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {Object.entries(suggestion.recommendations).map(([key, value]) => (
                        <li key={key} className="text-sm text-yellow-800">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: {String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Procedure References */}
            {suggestion.procedure_references && suggestion.procedure_references.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Icon name={ICONS.BOOK_OPEN} size="md" className="text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Referenced Procedures:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.procedure_references.map((ref, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords Detected */}
            {suggestion.keywords_detected && suggestion.keywords_detected.keywords.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Keywords detected ({suggestion.keywords_detected.category}):</p>
                <p className="italic">{suggestion.keywords_detected.keywords.join(', ')}</p>
              </div>
            )}

            {/* Low Confidence Warning */}
            {suggestion.confidence === 'low' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                <p className="font-semibold mb-1">Warning: Low Confidence Suggestion</p>
                <p>
                  This suggestion may not be fully accurate. Please review carefully and consider
                  writing your own text based on your specific situation.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onReject}
            data-testid="ai-suggestion-reject"
            disabled={isLoading}
          >
            Reject
          </Button>
          <Button
            variant="default"
            onClick={handleAccept}
            data-testid="ai-suggestion-accept"
            disabled={isLoading || !suggestion}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Accept & Use This Text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
