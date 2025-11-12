'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { cn } from '@/lib/utils';

export interface WhyNode {
  id: string;
  question: string;
  answer: string;
  depth: number;
}

export interface FiveWhyBuilderProps {
  initialProblem?: string;
  initialWhys?: WhyNode[];
  onChange?: (problem: string, whys: WhyNode[]) => void;
  onComplete?: (problem: string, whys: WhyNode[], rootCause: string) => void;
  minDepth?: number;
  maxDepth?: number;
  required?: boolean;
  className?: string;
}

/**
 * Interactive 5-Why Builder Component
 * 
 * Visual tree builder for root cause analysis following 5-Why methodology
 * 
 * @example
 * ```tsx
 * <FiveWhyBuilder
 *   initialProblem="Seal failure on packaging line"
 *   minDepth={3}
 *   maxDepth={5}
 *   onChange={(problem, whys) => {
 *     // Update form state
 *   }}
 *   onComplete={(problem, whys, rootCause) => {
 *     // Auto-populate root cause analysis field
 *   }}
 * />
 * ```
 */
export function FiveWhyBuilder({
  initialProblem = '',
  initialWhys = [],
  onChange,
  onComplete,
  minDepth = 3,
  maxDepth = 5,
  required = false,
  className,
}: FiveWhyBuilderProps) {
  const [problem, setProblem] = useState(initialProblem);
  const [whys, setWhys] = useState<WhyNode[]>(initialWhys);
  const [rootCause, setRootCause] = useState('');

  // Generate unique ID for new node
  const generateId = useCallback(() => {
    return `why-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add a new "Why" level
  const addWhy = useCallback(() => {
    if (whys.length >= maxDepth) return;

    const newWhy: WhyNode = {
      id: generateId(),
      question: `Why ${whys.length + 1}`,
      answer: '',
      depth: whys.length + 1,
    };

    const updated = [...whys, newWhy];
    setWhys(updated);
    onChange?.(problem, updated);
  }, [whys, maxDepth, generateId, problem, onChange]);

  // Remove a "Why" level
  const removeWhy = useCallback(
    (id: string) => {
      const updated = whys.filter((w) => w.id !== id);
      setWhys(updated);
      onChange?.(problem, updated);
    },
    [whys, problem, onChange]
  );

  // Update a "Why" node
  const updateWhy = useCallback(
    (id: string, field: 'question' | 'answer', value: string) => {
      const updated = whys.map((w) => (w.id === id ? { ...w, [field]: value } : w));
      setWhys(updated);
      onChange?.(problem, updated);
    },
    [whys, problem, onChange]
  );

  // Update problem statement
  const handleProblemChange = useCallback(
    (value: string) => {
      setProblem(value);
      onChange?.(value, whys);
    },
    [whys, onChange]
  );

  // Update root cause
  const handleRootCauseChange = useCallback(
    (value: string) => {
      setRootCause(value);
    },
    []
  );

  // Check if analysis is complete
  const isComplete = problem.trim().length > 0 && whys.length >= minDepth && whys.every((w) => w.answer.trim().length > 0) && rootCause.trim().length > 0;

  // Handle completion
  const handleComplete = useCallback(() => {
    if (isComplete && onComplete) {
      onComplete(problem, whys, rootCause);
    }
  }, [isComplete, onComplete, problem, whys, rootCause]);

  // Generate formatted root cause text
  const generateRootCauseText = useCallback(() => {
    if (!isComplete) return '';

    let text = `Problem: ${problem}\n\n`;
    whys.forEach((why, index) => {
      text += `${index + 1}. ${why.question}: ${why.answer}\n`;
    });
    text += `\nRoot Cause: ${rootCause}`;

    return text;
  }, [problem, whys, rootCause, isComplete]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Problem Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Problem Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={problem}
            onChange={(e) => handleProblemChange(e.target.value)}
            placeholder="Describe the problem or non-conformance..."
            rows={3}
            required={required}
          />
        </CardContent>
      </Card>

      {/* 5-Why Chain */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">5-Why Analysis</CardTitle>
            {whys.length < maxDepth && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addWhy}
                disabled={whys.length >= maxDepth}
              >
                <Icon name={ICONS.PLUS} size="sm" className="mr-2" />
                Add Why
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {whys.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Click "Add Why" to start your analysis</p>
              <p className="text-xs">Minimum {minDepth} levels required</p>
            </div>
          )}

          {whys.map((why, index) => (
            <div key={why.id} className="space-y-2">
              {/* Visual connector */}
              {index > 0 && (
                <div className="flex items-center justify-center py-2">
                  <Icon name={ICONS.CHEVRON_RIGHT} size="sm" className="text-muted-foreground rotate-90" />
                </div>
              )}

              {/* Why node */}
              <div className="border rounded-lg p-4 bg-accent/50">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <Label className="text-sm font-medium">
                    Why {index + 1} {index === 0 && '(Why did this happen?)'}
                  </Label>
                  {whys.length > minDepth && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeWhy(why.id)}
                      className="h-6 w-6"
                    >
                      <Icon name={ICONS.DELETE} size="xs" />
                    </Button>
                  )}
                </div>
                <Input
                  value={why.question}
                  onChange={(e) => updateWhy(why.id, 'question', e.target.value)}
                  placeholder={`Why ${index + 1} question...`}
                  className="mb-2"
                />
                <Textarea
                  value={why.answer}
                  onChange={(e) => updateWhy(why.id, 'answer', e.target.value)}
                  placeholder={`Answer to Why ${index + 1}...`}
                  rows={2}
                  required={required}
                />
              </div>
            </div>
          ))}

          {/* Depth indicator */}
          {whys.length > 0 && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              Depth: {whys.length}/{maxDepth} levels
              {whys.length < minDepth && (
                <span className="text-yellow-600 ml-2">
                  (Need {minDepth - whys.length} more)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Root Cause Summary */}
      {whys.length >= minDepth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Root Cause</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={rootCause}
              onChange={(e) => handleRootCauseChange(e.target.value)}
              placeholder="Summarize the root cause based on your 5-Why analysis..."
              rows={3}
              required={required}
            />
            {isComplete ? <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <Icon name={ICONS.SUCCESS} size="sm" />
                <span>Analysis complete</span>
              </div> : null}
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      {isComplete && onComplete ? <Button
          type="button"
          onClick={handleComplete}
          className="w-full"
          variant="default"
        >
          Use This Analysis
        </Button> : null}
    </div>
  );
}

