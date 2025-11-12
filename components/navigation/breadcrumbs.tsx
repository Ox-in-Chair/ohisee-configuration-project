'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Breadcrumbs Component
 * Displays navigation breadcrumbs based on current pathname
 * Automatically generates breadcrumbs from route structure
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Format label (capitalize, replace hyphens)
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Special handling for common routes
      let displayLabel = label;
      if (segment === 'nca') {
        displayLabel = 'NCA';
      } else if (segment === 'mjc') {
        displayLabel = 'MJC';
      } else if (segment === 'new') {
        displayLabel = 'New';
      } else if (segment === 'register') {
        displayLabel = 'Register';
      } else if (segment === 'dashboard') {
        displayLabel = 'Dashboard';
      } else if (segment === 'management') {
        displayLabel = 'Management';
      } else if (segment === 'production') {
        displayLabel = 'Production';
      } else if (segment === 'end-of-day') {
        displayLabel = 'End of Day';
      } else if (!isNaN(Number(segment))) {
        // If it's a number (like an ID), show "Details"
        displayLabel = 'Details';
      }

      items.push({
        label: displayLabel,
        href: currentPath,
      });
    });

    return items;
  }, [pathname]);

  // Don't show breadcrumbs on home page
  if (pathname === '/') {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center space-x-1 text-sm text-muted-foreground px-4 lg:px-6 py-2 border-b bg-surface/50"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <Icon name={ICONS.CHEVRON_RIGHT} size="sm" className="mx-1 text-muted-foreground" aria-hidden="true" />
              )}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {index === 0 ? (
                    <Icon name={ICONS.HOME} size="sm" aria-label="Home" />
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


