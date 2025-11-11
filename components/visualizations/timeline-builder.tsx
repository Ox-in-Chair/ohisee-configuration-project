'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  location: string;
  description: string;
  type: 'detection' | 'action' | 'observation' | 'other';
}

export interface TimelineBuilderProps {
  initialEvents?: TimelineEvent[];
  onChange?: (events: TimelineEvent[], formattedText: string) => void;
  onComplete?: (events: TimelineEvent[], formattedText: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Visual Timeline Builder Component
 * 
 * Interactive timeline builder for NC descriptions (when/where/what)
 * 
 * @example
 * ```tsx
 * <TimelineBuilder
 *   initialEvents={[]}
 *   onChange={(events, text) => {
 *     // Update form state
 *   }}
 *   onComplete={(events, text) => {
 *     // Auto-populate NC description field
 *   }}
 * />
 * ```
 */
export function TimelineBuilder({
  initialEvents = [],
  onChange,
  onComplete,
  required = false,
  className,
}: TimelineBuilderProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);

  // Generate unique ID for new event
  const generateId = useCallback(() => {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add a new event
  const addEvent = useCallback(() => {
    const newEvent: TimelineEvent = {
      id: generateId(),
      timestamp: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
      location: '',
      description: '',
      type: 'observation',
    };

    const updated = [...events, newEvent];
    setEvents(updated);
    const formatted = formatTimeline(updated);
    onChange?.(updated, formatted);
  }, [events, generateId, onChange]);

  // Remove an event
  const removeEvent = useCallback(
    (id: string) => {
      const updated = events.filter((e) => id !== e.id);
      setEvents(updated);
      const formatted = formatTimeline(updated);
      onChange?.(updated, formatted);
    },
    [events, onChange]
  );

  // Update an event
  const updateEvent = useCallback(
    (id: string, field: keyof TimelineEvent, value: string) => {
      const updated = events.map((e) => (e.id === id ? { ...e, [field]: value } : e));
      setEvents(updated);
      const formatted = formatTimeline(updated);
      onChange?.(updated, formatted);
    },
    [events, onChange]
  );

  // Format timeline as text
  const formatTimeline = useCallback((eventList: TimelineEvent[]): string => {
    if (eventList.length === 0) return '';

    // Sort by timestamp
    const sorted = [...eventList].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    let text = 'Timeline of Events:\n\n';
    sorted.forEach((event, index) => {
      const date = new Date(event.timestamp);
      const dateStr = date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      text += `${index + 1}. [${dateStr}] ${event.location ? `Location: ${event.location} - ` : ''}${event.description}\n`;
    });

    return text;
  }, []);

  // Get event type icon
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'detection':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'action':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'observation':
        return <MapPin className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Handle complete
  const handleComplete = useCallback(() => {
    if (events.length > 0 && onComplete) {
      const formatted = formatTimeline(events);
      onComplete(events, formatted);
    }
  }, [events, onComplete, formatTimeline]);

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Timeline of Events</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Click "Add Event" to build your timeline</p>
              <p className="text-xs mt-1">Document when, where, and what happened</p>
            </div>
          )}

          {events.map((event, index) => (
            <div key={event.id} className="border rounded-lg p-4 bg-accent/50">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  {getEventIcon(event.type)}
                  <Label className="text-sm font-medium">Event {index + 1}</Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeEvent(event.id)}
                  className="h-6 w-6"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs">When</Label>
                  <Input
                    type="datetime-local"
                    value={event.timestamp}
                    onChange={(e) => updateEvent(event.id, 'timestamp', e.target.value)}
                    required={required}
                  />
                </div>
                <div>
                  <Label className="text-xs">Where</Label>
                  <Input
                    value={event.location}
                    onChange={(e) => updateEvent(event.id, 'location', e.target.value)}
                    placeholder="Location or area..."
                    required={required}
                  />
                </div>
              </div>

              <div className="mb-3">
                <Label className="text-xs">Event Type</Label>
                <select
                  value={event.type}
                  onChange={(e) => updateEvent(event.id, 'type', e.target.value as TimelineEvent['type'])}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="detection">Detection</option>
                  <option value="action">Action Taken</option>
                  <option value="observation">Observation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">What Happened</Label>
                <Textarea
                  value={event.description}
                  onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                  placeholder="Describe what happened at this time and location..."
                  rows={2}
                  required={required}
                />
              </div>
            </div>
          ))}

          {/* Timeline Preview */}
          {events.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <Label className="text-xs font-medium mb-2 block">Preview:</Label>
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {formatTimeline(events)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Button */}
      {events.length > 0 && onComplete && (
        <Button type="button" onClick={handleComplete} className="w-full" variant="default">
          Use This Timeline
        </Button>
      )}
    </div>
  );
}

