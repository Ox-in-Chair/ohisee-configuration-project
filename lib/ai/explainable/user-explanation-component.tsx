/**
 * User Explanation Component
 * React component for displaying explainable AI insights to users
 * Provides "Why?" links next to validation messages
 */

'use client';

import { FC, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface UserExplanationProps {
  field: string;
  message: string;
  explanation: string;
  ruleReference?: string;
  example?: string;
}

export const UserExplanation: FC<UserExplanationProps> = ({
  field: _field,
  message,
  explanation,
  ruleReference,
  example,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // If explanation is not provided, don't show the component
  if (!explanation) {
    return <span className="text-sm text-gray-700">{message}</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-sm text-gray-700">{message}</span>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
              aria-label="Explain why this requirement exists"
            >
              <Icon name={ICONS.HELP} size="xs" className="mr-1" />
              Why?
              {isOpen ? (
                <Icon name={ICONS.CHEVRON_UP} size="xs" className="ml-1" />
              ) : (
                <Icon name={ICONS.CHEVRON_DOWN} size="xs" className="ml-1" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 pl-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
              <p className="text-blue-900">{explanation}</p>
              {ruleReference && (
                <p className="text-xs text-blue-700">
                  <span className="font-medium">Reference:</span> {ruleReference}
                </p>
              )}
              {example && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">Example:</p>
                  <p className="text-xs text-blue-800 italic">{example}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

