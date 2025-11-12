'use client';

/**
 * Writing Assistant Modal
 * Shows writing suggestions with accept/reject options
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
 * WritingAssistantModal Props
 */
export interface WritingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (suggestionText: string) => void;
  onReject: () => void;
  suggestion: Suggestion | null;
  isLoading?: boolean;
}

/**
 * Writing Assistant Modal Component
 *
 * Displays writing suggestions with context and procedure references
 *
 * @example
 * ```tsx
 * <WritingAssistantModal
 *   isOpen={showSuggestion}
 *   onClose={() => setShowSuggestion(false)}
 *   onAccept={(text) => handleAcceptSuggestion(text)}
 *   onReject={handleRejectSuggestion}
 *   suggestion={suggestion}
 * />
 * ```
 */
export const WritingAssistantModal: FC<WritingAssistantModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onReject,
  suggestion,
  isLoading = false,
}) => {
  // Don't render if modal is closed
  if (!isOpen) return null;

  const handleAccept = () => {
    if (suggestion) {
      onAccept(suggestion.text);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="glass max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="writing-assistant-modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Icon name={ICONS.FILE_TEXT} size="lg" className="text-blue-600" />
            <DialogTitle className="text-xl">Writing Suggestions</DialogTitle>
          </div>
          <DialogDescription>
            Review the suggested text below and decide whether to use it.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="ml-4 text-gray-600">Analyzing your entry...</p>
          </div>
        ) : suggestion ? (
          <div className="space-y-4">
            {/* Quality Score Badge (if available) */}
            {suggestion.quality_score !== undefined && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Quality Score: {suggestion.quality_score}/100
                </Badge>
              </div>
            )}

            {/* Suggested Text */}
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Icon name={ICONS.WARNING} size="md" className="text-gray-400 mb-4" />
            <p className="text-gray-600 text-center">
              No writing suggestions available at this time.
            </p>
            <p className="text-sm text-gray-500 text-center mt-2">
              Please ensure your description contains enough detail for analysis.
            </p>
          </div>
        )}

        {/* Actions */}
        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onReject}
            data-testid="suggestion-reject"
            disabled={isLoading}
          >
            {suggestion ? 'Reject' : 'Close'}
          </Button>
          {suggestion && (
            <Button
              variant="default"
              onClick={handleAccept}
              data-testid="suggestion-accept"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Accept & Use This Text
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

