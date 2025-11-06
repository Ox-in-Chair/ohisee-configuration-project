/**
 * Character Counter Component
 * Reusable component for displaying character count with color-coded status
 */

import React from 'react';

interface CharacterCounterProps {
  current: number;
  minimum: number;
  maximum?: number;
  testId?: string;
}

/**
 * Character counter component with color-coded status
 * - Green: >= minimum characters
 * - Yellow: 50-99% of minimum
 * - Red: < 50% of minimum
 */
export function CharacterCounter({
  current,
  minimum,
  maximum,
  testId,
}: CharacterCounterProps): React.ReactElement {
  const getColorClass = (): string => {
    if (current >= minimum) return 'text-green-600';
    if (current >= minimum / 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const displayText = maximum
    ? `${current} / ${minimum} minimum (${maximum} max)`
    : `${current} / ${minimum}`;

  return (
    <div className={`text-sm mt-1 ${getColorClass()}`} data-testid={testId}>
      {displayText}
    </div>
  );
}
