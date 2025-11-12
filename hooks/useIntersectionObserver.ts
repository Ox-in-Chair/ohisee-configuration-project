/**
 * useIntersectionObserver Hook
 *
 * Provides lazy-loading capabilities using the IntersectionObserver API.
 * Once an element becomes visible, it remains visible (one-time observation).
 *
 * @param ref - React ref to the element to observe
 * @param options - IntersectionObserver options (threshold, rootMargin, etc.)
 * @returns boolean indicating if the element is visible
 *
 * Usage:
 * ```typescript
 * const ref = useRef<HTMLDivElement>(null);
 * const isVisible = useIntersectionObserver(ref, { threshold: 0.1 });
 *
 * return (
 *   <div ref={ref}>
 *     {isVisible ? <ExpensiveComponent /> : <Skeleton />}
 *   </div>
 * );
 * ```
 */

import { useState, useEffect, RefObject } from 'react';

export function useIntersectionObserver(
  ref: RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported (SSR safety)
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: immediately mark as visible (defer to avoid setState in effect)
      setTimeout(() => setIsVisible(true), 0);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing (one-time observation)
          observer.disconnect();
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '50px',
        ...options,
      }
    );

    observer.observe(element);

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}
