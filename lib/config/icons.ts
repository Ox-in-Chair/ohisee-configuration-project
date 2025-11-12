/**
 * Icon Constants
 *
 * Centralized icon name mapping for type safety and consistency.
 * All icon names map to lucide-react icon components.
 *
 * Usage:
 * import { ICONS } from '@/lib/config/icons';
 * import { Icon } from '@/components/ui/icons';
 *
 * <Icon name={ICONS.HELP} size="md" />
 *
 * Organized by category for easy discovery.
 */

export const ICONS = {
  // UI Actions
  HELP: 'HelpCircle',
  CLOSE: 'X',
  CHECK: 'Check',
  PLUS: 'Plus',
  EDIT: 'Edit2',
  SAVE: 'Save',
  DELETE: 'Trash2',
  SEARCH: 'Search',
  MENU: 'Menu',
  EXTERNAL_LINK: 'ExternalLink',
  LINK: 'Link2',

  // Status & Feedback
  LOADING: 'Loader2',
  SUCCESS: 'CheckCircle2',
  SUCCESS_ALT: 'CheckCircle',
  ERROR: 'XCircle',
  WARNING: 'AlertCircle',
  ALERT: 'AlertTriangle',
  SHIELD: 'Shield',

  // Navigation
  CHEVRON_DOWN: 'ChevronDown',
  CHEVRON_UP: 'ChevronUp',
  CHEVRON_LEFT: 'ChevronLeft',
  CHEVRON_RIGHT: 'ChevronRight',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP_DOWN: 'ArrowUpDown',
  HOME: 'Home',

  // Documents & Files
  FILE_TEXT: 'FileText',
  FILE_ICON: 'FileIcon',
  BOOK_OPEN: 'BookOpen',
  UPLOAD: 'Upload',

  // Work & Production
  WRENCH: 'Wrench',
  PACKAGE: 'Package',
  CALENDAR: 'Calendar',
  CLOCK: 'Clock',
  MAP_PIN: 'MapPin',

  // Analytics & Charts
  TRENDING_UP: 'TrendingUp',
  TRENDING_DOWN: 'TrendingDown',
  BAR_CHART: 'BarChart3',
  PIE_CHART: 'PieChart',
  MINUS: 'Minus',

  // User & Communication
  USER: 'User',
  USERS: 'Users',
  MESSAGE: 'MessageSquare',

  // AI & Smart Features
  SPARKLES: 'Sparkles',

  // Media Controls
  VOLUME_ON: 'Volume2',
  VOLUME_OFF: 'VolumeX',
  PLAY: 'Play',
  PAUSE: 'Pause',
  STOP: 'Square',
  MIC_ON: 'Mic',
  MIC_OFF: 'MicOff',

  // App Sections (Dashboard Navigation)
  DASHBOARD: 'LayoutDashboard',

  // UI Components (for shadcn/ui components)
  CHECK_ICON: 'CheckIcon',
  CHEVRON_DOWN_ICON: 'ChevronDownIcon',
  CHEVRON_UP_ICON: 'ChevronUpIcon',
  CIRCLE_ICON: 'CircleIcon',
} as const;

// Type for icon keys (for type-safe usage)
export type IconKey = keyof typeof ICONS;

// Type for icon values (actual lucide-react icon names)
export type IconValue = (typeof ICONS)[IconKey];

/**
 * Helper to get icon name by key
 * Useful for dynamic icon selection
 */
export function getIconName(key: IconKey): IconValue {
  return ICONS[key];
}

/**
 * Icon categories for documentation and discovery
 */
export const ICON_CATEGORIES = {
  'UI Actions': [
    'HELP',
    'CLOSE',
    'CHECK',
    'PLUS',
    'EDIT',
    'SAVE',
    'DELETE',
    'SEARCH',
    'MENU',
    'EXTERNAL_LINK',
    'LINK',
  ],
  'Status & Feedback': [
    'LOADING',
    'SUCCESS',
    'SUCCESS_ALT',
    'ERROR',
    'WARNING',
    'ALERT',
    'SHIELD',
  ],
  Navigation: [
    'CHEVRON_DOWN',
    'CHEVRON_UP',
    'CHEVRON_LEFT',
    'CHEVRON_RIGHT',
    'ARROW_LEFT',
    'ARROW_RIGHT',
    'ARROW_UP',
    'ARROW_DOWN',
    'ARROW_UP_DOWN',
    'HOME',
  ],
  'Documents & Files': ['FILE_TEXT', 'FILE_ICON', 'BOOK_OPEN', 'UPLOAD'],
  'Work & Production': ['WRENCH', 'PACKAGE', 'CALENDAR', 'CLOCK', 'MAP_PIN'],
  'Analytics & Charts': [
    'TRENDING_UP',
    'TRENDING_DOWN',
    'BAR_CHART',
    'PIE_CHART',
    'MINUS',
  ],
  'User & Communication': ['USER', 'MESSAGE'],
  'AI & Smart Features': ['SPARKLES'],
  'Media Controls': [
    'VOLUME_ON',
    'VOLUME_OFF',
    'PLAY',
    'PAUSE',
    'STOP',
    'MIC_ON',
    'MIC_OFF',
  ],
  'App Sections': ['DASHBOARD'],
} as const;
