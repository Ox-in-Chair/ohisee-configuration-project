# Critical Performance Fixes - Code Examples

## 1. React.memo Wrapper Pattern

### BEFORE - quality-indicator.tsx (lines 28-105)
```typescript
export const QualityIndicator: FC<QualityIndicatorProps> = ({
  score,
  isChecking = false,
  threshold = 75,
  showDetails = false,
}) => {
  // ... component code
};
```

### AFTER
```typescript
import { memo } from 'react';

interface QualityIndicatorProps {
  score: number | null;
  isChecking?: boolean;
  threshold?: number;
  showDetails?: boolean;
}

export const QualityIndicator = memo<QualityIndicatorProps>(
  ({ score, isChecking = false, threshold = 75, showDetails = false }) => {
    // ... component code
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    return (
      prevProps.score === nextProps.score &&
      prevProps.isChecking === nextProps.isChecking &&
      prevProps.threshold === nextProps.threshold &&
      prevProps.showDetails === nextProps.showDetails
    );
  }
);

QualityIndicator.displayName = 'QualityIndicator';
```

---

## 2. useCallback Extraction Pattern

### BEFORE - enhanced-textarea.tsx (lines 168-180)
```typescript
{enableVoiceInput && (
  <VoiceInput
    onTranscript={(text) => {  // ← NEW FUNCTION EVERY RENDER
      const newValue = value ? `${value} ${text}` : text;
      onChange(newValue);
      if (enableRewrite && onQualityCheck && newValue.trim().length > 0) {
        setTimeout(() => {
          onQualityCheck().catch((err) => {
            console.error('Quality check failed after voice input:', err);
          });
        }, 500);
      }
    }}
    disabled={disabled}
    className="hidden sm:inline-flex"
  />
)}
```

### AFTER
```typescript
import { useCallback } from 'react';

export const EnhancedTextarea: FC<EnhancedTextareaProps> = ({
  // ... props
}) => {
  // Extract callback with proper dependencies
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const newValue = value ? `${value} ${text}` : text;
      onChange(newValue);
      
      // Only trigger if conditions met
      if (!enableRewrite || !onQualityCheck || !newValue.trim().length) {
        return;
      }
      
      // Debounce quality check - use one timeout per effect
      const timeoutId = setTimeout(() => {
        onQualityCheck()
          .catch((err) => {
            console.error('Quality check failed after voice input:', err);
          });
      }, 500);
      
      return () => clearTimeout(timeoutId);
    },
    [value, onChange, enableRewrite, onQualityCheck]
  );

  return (
    <VoiceInput
      onTranscript={handleVoiceTranscript}  // ← STABLE FUNCTION REFERENCE
      disabled={disabled}
      className="hidden sm:inline-flex"
    />
  );
};
```

---

## 3. Virtual Scrolling for Tables

### BEFORE - nca-table.tsx (lines 492-519)
```typescript
{paginatedNCAs.map(nca => (
  <TableRow
    key={nca.id}
    onClick={() => handleRowClick(nca)}
    className="cursor-pointer hover:bg-gray-50 transition-colors"
    data-testid="nca-table-row"
  >
    <TableCell className="font-medium font-alt">
      {nca.nca_number}
    </TableCell>
    <TableCell>
      <Badge variant={getStatusVariant(nca.status)}>
        {nca.status}
      </Badge>
    </TableCell>
    {/* ... more cells ... */}
  </TableRow>
))}
```

### AFTER - Using react-window
```typescript
import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

// Extract row component for memoization
const NCAtableRow = memo(function NCAtableRow({
  index,
  style,
  data,
  onRowClick,
}: {
  index: number;
  style: React.CSSProperties;
  data: NCAData[];
  onRowClick: (nca: NCAData) => void;
}) {
  const nca = data[index];
  
  return (
    <div style={style} onClick={() => onRowClick(nca)}>
      <TableRow
        key={nca.id}
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        data-testid="nca-table-row"
      >
        <TableCell className="font-medium font-alt">
          {nca.nca_number}
        </TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(nca.status)}>
            {nca.status}
          </Badge>
        </TableCell>
        {/* ... more cells ... */}
      </TableRow>
    </div>
  );
});

// In component render:
<List
  height={600}
  itemCount={paginatedNCAs.length}
  itemSize={48}  // Row height
  width="100%"
  itemData={paginatedNCAs}
>
  {({ index, style, data }) => (
    <NCAtableRow
      index={index}
      style={style}
      data={data}
      onRowClick={handleRowClick}
    />
  )}
</List>
```

---

## 4. Fix setTimeout Memory Leak

### BEFORE - multiple setTimeout calls
```typescript
// Line 175
if (enableRewrite && onQualityCheck && newValue.trim().length > 0) {
  setTimeout(() => {
    onQualityCheck().catch((err) => {
      console.error('Quality check failed:', err);
    });
  }, 500);
}

// Line 262 - DUPLICATE
if (enableRewrite && onQualityCheck && newValue.trim().length > 0) {
  setTimeout(() => {
    onQualityCheck().catch((err) => {
      console.error('Quality check failed:', err);
    });
  }, 500);
}
```

### AFTER - Cleanup in effect
```typescript
import { useEffect, useRef } from 'react';

const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  // Only run if conditions met
  if (!enableRewrite || !onQualityCheck || !value?.trim().length) {
    return;
  }

  // Set timeout
  timeoutRef.current = setTimeout(() => {
    onQualityCheck()
      .catch((err) => {
        console.error('Quality check failed:', err);
      });
  }, 500);

  // Cleanup on unmount or dependency change
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [value, enableRewrite, onQualityCheck]);
```

---

## 5. Merge Duplicate Components

### BEFORE - Two components
```typescript
// quality-indicator.tsx
export const QualityIndicator: FC<QualityIndicatorProps> = ({
  score,
  // ...
}) => {
  const getMessage = (): string => {
    if (score >= threshold) return 'Meets requirements';
    if (score >= 60) return 'Review recommended';
    return 'Incomplete';
  };
  // ... 99 more lines
};

// ai-quality-badge.tsx
export const AIQualityBadge: FC<AIQualityBadgeProps> = ({
  score,
  // ...
}) => {
  const getMessage = (): string => {
    if (score >= threshold) return 'Excellent quality';
    if (score >= 60) return 'Needs improvement';
    return 'Below threshold';
  };
  // ... 99 more lines
};
```

### AFTER - Single unified component
```typescript
type MessageStyle = 'quality' | 'validation';

export interface QualityBadgeProps {
  score: number | null;
  isChecking?: boolean;
  threshold?: number;
  showDetails?: boolean;
  messageStyle?: MessageStyle;  // 'quality' or 'validation'
}

const MESSAGES: Record<MessageStyle, Record<string, string>> = {
  quality: {
    pass: 'Excellent quality',
    review: 'Needs improvement',
    fail: 'Below threshold',
  },
  validation: {
    pass: 'Meets requirements',
    review: 'Review recommended',
    fail: 'Incomplete',
  },
};

export const QualityBadge = memo<QualityBadgeProps>(
  ({
    score,
    isChecking = false,
    threshold = 75,
    showDetails = false,
    messageStyle = 'quality',
  }) => {
    if (isChecking) {
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-2 bg-gray-50 text-gray-600"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{messageStyle === 'quality' ? 'Checking quality...' : 'Validating...'}</span>
        </Badge>
      );
    }

    if (score === null) {
      return null;
    }

    const getVariant = (): 'default' | 'destructive' | 'secondary' | 'outline' => {
      if (score >= threshold) return 'default';
      if (score >= 60) return 'secondary';
      return 'destructive';
    };

    const getIcon = () => {
      if (score >= threshold) return <CheckCircle2 className="h-3 w-3" />;
      if (score >= 60) return <AlertCircle className="h-3 w-3" />;
      return <XCircle className="h-3 w-3" />;
    };

    const getMessage = (): string => {
      if (score >= threshold) return MESSAGES[messageStyle].pass;
      if (score >= 60) return MESSAGES[messageStyle].review;
      return MESSAGES[messageStyle].fail;
    };

    const variant = getVariant();

    return (
      <div className="flex flex-col gap-1">
        <Badge
          variant={variant}
          className="flex items-center gap-2 w-fit"
          data-testid="quality-badge"
          data-score={score}
        >
          {getIcon()}
          <span className="font-semibold">{score}/100</span>
          {showDetails && (
            <>
              <span className="mx-1">•</span>
              <span className="text-xs">{getMessage()}</span>
            </>
          )}
        </Badge>

        {showDetails && score < threshold && (
          <p className="text-xs text-gray-600 mt-1">
            Threshold: {threshold}/100
            {score < threshold && (
              <span className="text-red-600 ml-2">
                ({threshold - score} points needed)
              </span>
            )}
          </p>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.score === nextProps.score &&
      prevProps.isChecking === nextProps.isChecking &&
      prevProps.threshold === nextProps.threshold &&
      prevProps.showDetails === nextProps.showDetails &&
      prevProps.messageStyle === nextProps.messageStyle
    );
  }
);

QualityBadge.displayName = 'QualityBadge';

// Exports for backward compatibility
export const QualityIndicator = (props: Omit<QualityBadgeProps, 'messageStyle'>) => (
  <QualityBadge {...props} messageStyle="validation" />
);

export const AIQualityBadge = (props: Omit<QualityBadgeProps, 'messageStyle'>) => (
  <QualityBadge {...props} messageStyle="quality" />
);
```

---

## 6. Memoize Recharts Configuration

### BEFORE - dashboard charts
```typescript
export function NCTrendAnalysisMonthlyChart({ data }: NCTrendAnalysisMonthlyChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {/* ... */}
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### AFTER
```typescript
import { memo, useMemo } from 'react';

// Extracted constants (outside component)
const CHART_MARGIN = { top: 5, right: 30, left: 20, bottom: 60 };
const GRID_STROKE = '#e5e7eb';
const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  fontSize: '12px',
};

interface ChartProps {
  data: MonthlyTrendData[];
}

export const NCTrendAnalysisMonthlyChart = memo<ChartProps>(
  function NCTrendAnalysisMonthlyChart({ data }) {
    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            allowDecimals={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend />
          <Bar dataKey="opened" name="Opened" fill="#3b82f6" />
          <Bar dataKey="closed" name="Closed" fill="#10b981" />
          <Bar dataKey="stillOpen" name="Still Open" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    );
  },
  (prev, next) => prev.data === next.data  // Simple reference comparison
);

NCTrendAnalysisMonthlyChart.displayName = 'NCTrendAnalysisMonthlyChart';
```

---

## 7. Smart Input useEffect Consolidation

### BEFORE - smart-input.tsx (multiple overlapping effects)
```typescript
// EFFECT 1: Clear suggestions
useEffect(() => {
  if (!showSuggestions || !isFocused || !value || value.length < 2) {
    setAutocompleteSuggestions(prev => (prev.length > 0 ? [] : prev));
    setShowAutocomplete(prev => (prev ? false : prev));
  }
}, [showSuggestions, isFocused, value]);

// EFFECT 2: Load suggestions with debounce
useEffect(() => {
  if (!showSuggestions || !isFocused || !value || value.length < 2) {
    return;
  }

  const loadSuggestions = async () => {
    // ... load logic
  };

  const timeoutId = setTimeout(loadSuggestions, 300);
  return () => clearTimeout(timeoutId);
}, [value, fieldName, showSuggestions, isFocused, stableExternalSuggestions]);
```

### AFTER - Single consolidated effect
```typescript
import { useEffect, useRef, useCallback } from 'react';

export const SmartInput: FC<SmartInputProps> = ({
  // ... props
}) => {
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Single consolidated effect
  useEffect(() => {
    // Early exit conditions
    if (!showSuggestions || !isFocused || !value || value.length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    // Debounced load
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        let newSuggestions: string[] = [];

        if (fieldName === 'nc_product_description') {
          const packagingService = createPackagingSafetyService();
          const materials = await packagingService.searchMaterials(value);
          newSuggestions = materials.map(m => `${m.material_code} - ${m.material_name}`);
        } else {
          newSuggestions = externalSuggestions;
        }

        setAutocompleteSuggestions(newSuggestions);
        setShowAutocomplete(newSuggestions.length > 0);
      } catch (error) {
        if (error instanceof DOMException && error.name !== 'AbortError') {
          console.error('Error loading suggestions:', error);
          setAutocompleteSuggestions([]);
          setShowAutocomplete(false);
        }
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, fieldName, showSuggestions, isFocused, externalSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ... rest of component
};
```

---

## Summary of Patterns

### Pattern 1: Always Memoize Pure Components
```typescript
export const MyComponent = React.memo<MyComponentProps>(
  (props) => { /* render */ },
  (prev, next) => { /* equality check */ }
);
MyComponent.displayName = 'MyComponent';
```

### Pattern 2: Extract Callbacks with useCallback
```typescript
const handleClick = useCallback(
  (value) => { /* handler logic */ },
  [dependency1, dependency2]
);
```

### Pattern 3: Memoize Static Objects
```typescript
const STATIC_OBJECT = { prop1: 'value1' };
const STATIC_MARGIN = { top: 5, right: 30 };

// Use in component
<Component margin={STATIC_MARGIN} />
```

### Pattern 4: Consolidate useEffect
```typescript
useEffect(() => {
  if (shouldRun) {
    // Single effect for related logic
  }
  return () => { /* cleanup */ };
}, [deps]);
```

### Pattern 5: Handle Timeouts Properly
```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    // logic
  }, delay);
  
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [deps]);
```

