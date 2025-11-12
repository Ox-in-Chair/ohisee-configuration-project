/**
 * Centralized Icon System
 *
 * This component provides a single import point for all lucide-react icons,
 * enabling better tree-shaking and bundle size optimization.
 *
 * Benefits:
 * - Single lucide-react import point (reduces bundle size)
 * - Consistent icon sizing across the app
 * - Type-safe icon names
 * - Easy to add new icons
 *
 * Usage:
 * import { Icon } from '@/components/ui/icons';
 * import { ICONS } from '@/lib/config/icons';
 *
 * <Icon name={ICONS.HELP} size="md" />
 * <Icon name={ICONS.LOADING} size="sm" className="animate-spin" />
 */

import React from 'react';
import { type LucideProps } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Icon name type - all lucide icons in camelCase
export type IconName = keyof typeof LucideIcons;

// Size variants for consistent sizing
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Size mapping in pixels
const SIZE_MAP: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export interface IconProps extends Omit<LucideProps, 'size'> {
  name: IconName;
  size?: IconSize | number; // Allow custom pixel size or predefined variant
  className?: string;
}

/**
 * Icon Component
 *
 * Renders a lucide-react icon with consistent sizing and styling.
 *
 * @param name - The icon name (use ICONS constants from lib/config/icons)
 * @param size - Predefined size variant or custom pixel size
 * @param props - Additional lucide-react props (color, strokeWidth, etc.)
 */
export function Icon({ name, size = 'md', className = '', ...props }: IconProps) {
  // Get the icon component from lucide-react
  const IconComponent = LucideIcons[name] as React.ComponentType<LucideProps>;

  // If icon doesn't exist, return null (fail gracefully)
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  // Determine the size value
  const sizeValue = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <IconComponent
      size={sizeValue}
      className={className}
      {...props}
    />
  );
}

/**
 * Helper hook to get icon by name
 * Useful for dynamic icon rendering
 */
export function useIcon(name: IconName) {
  return React.useCallback(
    (props: Omit<IconProps, 'name'>) => <Icon name={name} {...props} />,
    [name]
  );
}
