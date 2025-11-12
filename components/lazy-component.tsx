/**
 * LazyComponent Wrapper
 *
 * Provides intersection observer-based lazy loading for dashboard components.
 * Renders a fallback (skeleton) until the component scrolls into view, then
 * renders the actual component.
 *
 * Performance benefits:
 * - Reduces initial page load time by deferring off-screen components
 * - Reduces initial data fetching (if components fetch their own data)
 * - Improves Time to Interactive (TTI) metrics
 *
 * Usage:
 * ```typescript
 * <LazyComponent fallback={<ChartSkeleton />}>
 *   <ExpensiveChart data={data} />
 * </LazyComponent>
 * ```
 */

'use client';

import { useRef, type ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyComponentProps {
  /** The component to lazy-load */
  children: ReactNode;
  /** Fallback component to show while not visible (defaults to null) */
  fallback?: ReactNode;
  /** Intersection threshold (0-1). 0.1 means trigger when 10% visible */
  threshold?: number;
  /** Root margin for early loading (e.g., "50px" loads 50px before visible) */
  rootMargin?: string;
  /** Optional className for wrapper div */
  className?: string;
}

export function LazyComponent({
  children,
  fallback = null,
  threshold = 0.1,
  rootMargin = '50px',
  className,
}: LazyComponentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, {
    threshold,
    rootMargin,
  });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}
