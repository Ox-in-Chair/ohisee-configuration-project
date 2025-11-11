'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FishboneCategory {
  id: string;
  name: string;
  causes: string[];
}

export interface FishboneDiagramProps {
  initialProblem?: string;
  initialCategories?: FishboneCategory[];
  onChange?: (problem: string, categories: FishboneCategory[], formattedText: string) => void;
  onComplete?: (problem: string, categories: FishboneCategory[], formattedText: string) => void;
  required?: boolean;
  className?: string;
}

const DEFAULT_CATEGORIES = [
  { name: 'Man (People)', id: 'man' },
  { name: 'Machine (Equipment)', id: 'machine' },
  { name: 'Method (Process)', id: 'method' },
  { name: 'Material', id: 'material' },
  { name: 'Measurement', id: 'measurement' },
  { name: 'Environment', id: 'environment' },
];

/**
 * Fishbone Diagram Component (Ishikawa Diagram)
 * 
 * Visual cause-and-effect diagram generator for root cause analysis
 * 
 * @example
 * ```tsx
 * <FishboneDiagram
 *   initialProblem="Seal failure on packaging line"
 *   onChange={(problem, categories, text) => {
 *     // Update form state
 *   }}
 *   onComplete={(problem, categories, text) => {
 *     // Auto-populate root cause analysis field
 *   }}
 * />
 * ```
 */
export function FishboneDiagram({
  initialProblem = '',
  initialCategories = [],
  onChange,
  onComplete,
  required = false,
  className,
}: FishboneDiagramProps) {
  const [problem, setProblem] = useState(initialProblem);
  const [categories, setCategories] = useState<FishboneCategory[]>(
    initialCategories.length > 0
      ? initialCategories
      : DEFAULT_CATEGORIES.map((cat) => ({
          id: cat.id,
          name: cat.name,
          causes: [],
        }))
  );

  // Add cause to category
  const addCause = useCallback(
    (categoryId: string) => {
      const updated = categories.map((cat) =>
        cat.id === categoryId ? { ...cat, causes: [...cat.causes, ''] } : cat
      );
      setCategories(updated);
      const formatted = formatFishbone(problem, updated);
      onChange?.(problem, updated, formatted);
    },
    [categories, problem, onChange]
  );

  // Remove cause from category
  const removeCause = useCallback(
    (categoryId: string, causeIndex: number) => {
      const updated = categories.map((cat) =>
        cat.id === categoryId
          ? { ...cat, causes: cat.causes.filter((_, i) => i !== causeIndex) }
          : cat
      );
      setCategories(updated);
      const formatted = formatFishbone(problem, updated);
      onChange?.(problem, updated, formatted);
    },
    [categories, problem, onChange]
  );

  // Update cause text
  const updateCause = useCallback(
    (categoryId: string, causeIndex: number, value: string) => {
      const updated = categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              causes: cat.causes.map((c, i) => (i === causeIndex ? value : c)),
            }
          : cat
      );
      setCategories(updated);
      const formatted = formatFishbone(problem, updated);
      onChange?.(problem, updated, formatted);
    },
    [categories, problem, onChange]
  );

  // Update problem
  const handleProblemChange = useCallback(
    (value: string) => {
      setProblem(value);
      const formatted = formatFishbone(value, categories);
      onChange?.(value, categories, formatted);
    },
    [categories, onChange]
  );

  // Format fishbone as text
  const formatFishbone = useCallback((prob: string, cats: FishboneCategory[]): string => {
    if (!prob.trim()) return '';

    let text = `Problem: ${prob}\n\n`;
    text += 'Cause-and-Effect Analysis (Fishbone Diagram):\n\n';

    cats.forEach((cat) => {
      if (cat.causes.some((c) => c.trim().length > 0)) {
        text += `${cat.name}:\n`;
        cat.causes
          .filter((c) => c.trim().length > 0)
          .forEach((cause, index) => {
            text += `  ${index + 1}. ${cause}\n`;
          });
        text += '\n';
      }
    });

    return text;
  }, []);

  // Check if complete
  const isComplete =
    problem.trim().length > 0 &&
    categories.some((cat) => cat.causes.some((c) => c.trim().length > 0));

  // Handle complete
  const handleComplete = useCallback(() => {
    if (isComplete && onComplete) {
      const formatted = formatFishbone(problem, categories);
      onComplete(problem, categories, formatted);
    }
  }, [isComplete, onComplete, problem, categories, formatFishbone]);

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

      {/* Fishbone Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cause Categories (6M Analysis)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="border rounded-lg p-4 bg-accent/50">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">{category.name}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCause(category.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cause
                </Button>
              </div>

              {category.causes.length === 0 && (
                <div className="text-sm text-muted-foreground italic py-2">
                  No causes added yet
                </div>
              )}

              <div className="space-y-2">
                {category.causes.map((cause, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={cause}
                      onChange={(e) => updateCause(category.id, index, e.target.value)}
                      placeholder={`${category.name} cause ${index + 1}...`}
                      className="flex-1"
                      required={required}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeCause(category.id, index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Visual Diagram Preview */}
      {isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Analysis Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-md">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {formatFishbone(problem, categories)}
              </pre>
            </div>
            {isComplete && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Analysis complete</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      {isComplete && onComplete && (
        <Button type="button" onClick={handleComplete} className="w-full" variant="default">
          Use This Analysis
        </Button>
      )}
    </div>
  );
}

