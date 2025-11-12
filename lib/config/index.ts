/**
 * Configuration Module - Central Export
 * Single source of truth for all application configuration
 *
 * Usage:
 * ```typescript
 * // Import specific constants
 * import { USER_ROLES, VALIDATION, AI_CONFIG } from '@/lib/config';
 *
 * // Import defaults
 * import { NCA_DEFAULTS, MJC_DEFAULTS } from '@/lib/config';
 *
 * // Import enums
 * import { UserRoleEnum, NCAStatusEnum } from '@/lib/config';
 * ```
 *
 * Architecture:
 * - constants.ts: All magic values and configuration constants
 * - defaults.ts: Default values for forms and operations
 * - enums.ts: TypeScript enums for stricter type checking
 * - phase7-config.ts: Phase 7 AI feature configuration
 */

// ============================================================================
// RE-EXPORT CONSTANTS
// ============================================================================

export {
  // User Roles
  USER_ROLES,
  ROLE_HIERARCHY,
  type UserRole,

  // Status Values
  NCA_STATUS,
  MJC_STATUS,
  MACHINE_STATUS,
  WORK_ORDER_STATUS,
  type NCAStatus,
  type MJCStatus,
  type MachineStatus,
  type WorkOrderStatus,

  // NC Classification
  NC_ORIGIN,
  NC_TYPE,
  type NCOrigin,
  type NCType,

  // Disposition & Maintenance
  DISPOSITION_ACTION,
  MAINTENANCE_CATEGORY,
  MAINTENANCE_TYPE,
  URGENCY_LEVEL,
  type DispositionAction,
  type MaintenanceCategory,
  type MaintenanceType,
  type UrgencyLevel,

  // Units & Areas
  QUANTITY_UNIT,
  SEGREGATION_AREA,
  type QuantityUnit,
  type SegregationArea,

  // Validation Rules
  VALIDATION,

  // AI Configuration
  AI_CONFIG,

  // Database Configuration
  DB_CONFIG,

  // Feature Flags
  FEATURES,

  // Timeouts & Deadlines
  TIMEOUTS,

  // BRCGS Procedures
  BRCGS_PROCEDURES,

  // Email Configuration
  EMAIL_CONFIG,

  // Signature Types
  SIGNATURE_TYPE,
  type SignatureType,

  // File Configuration
  FILE_CONFIG,

  // Helper Functions
  getConstValues,
  isValidEnumValue,
  getRoleLevel,
  hasPermission,
} from './constants';

// ============================================================================
// RE-EXPORT DEFAULTS
// ============================================================================

export {
  // Form Defaults
  NCA_DEFAULTS,
  MJC_DEFAULTS,
  SIGNATURE_DEFAULTS,
  WORK_ORDER_DEFAULTS,

  // Dashboard Defaults
  DASHBOARD_FILTER_DEFAULTS,

  // Quality Scoring Defaults
  QUALITY_SCORE_DEFAULTS,

  // AI Suggestion Defaults
  AI_SUGGESTION_DEFAULTS,

  // Notification Defaults
  NOTIFICATION_DEFAULTS,

  // Helper Functions
  getCurrentDate,
  getCurrentTimestamp,
  getCurrentTime,
  calculateTemporaryRepairDueDate,
  calculateNCAClosureDeadline,
  mergeWithDefaults,
} from './defaults';

// ============================================================================
// RE-EXPORT ENUMS
// ============================================================================

export {
  // User & Status Enums
  UserRoleEnum,
  NCAStatusEnum,
  MJCStatusEnum,
  MachineStatusEnum,
  WorkOrderStatusEnum,

  // NC Classification Enums
  NCOriginEnum,
  NCTypeEnum,

  // Disposition & Maintenance Enums
  DispositionActionEnum,
  MaintenanceCategoryEnum,
  MaintenanceTypeEnum,
  UrgencyLevelEnum,

  // Unit & Area Enums
  QuantityUnitEnum,
  SegregationAreaEnum,

  // Signature & AI Enums
  SignatureTypeEnum,
  AIModeEnum,
  ConfidenceLevelEnum,

  // Notification Enum
  NotificationTypeEnum,

  // Helper Functions
  getEnumValues,
  isValidEnum,
  getEnumKey,
  enumToSelectOptions,
  formatEnumLabel,
} from './enums';

// ============================================================================
// RE-EXPORT PHASE 7 CONFIGURATION
// ============================================================================

export {
  type Phase7Config,
  getPhase7Config,
  isPhase7Enabled,
} from './phase7-config';

// ============================================================================
// ENVIRONMENT-AWARE CONFIGURATION
// ============================================================================

/**
 * Get configuration based on environment
 * Allows overriding defaults for development/testing
 */
export function getConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    environment: {
      isDevelopment,
      isTest,
      isProduction,
    },

    ai: {
      // Lower quality threshold in development
      qualityThreshold: isDevelopment
        ? AI_CONFIG.QUALITY_THRESHOLD_DEV
        : AI_CONFIG.QUALITY_THRESHOLD,

      // Shorter timeouts in test
      fastResponseTimeout: isTest
        ? 500
        : AI_CONFIG.FAST_RESPONSE_TIMEOUT,

      deepValidationTimeout: isTest
        ? 5000
        : AI_CONFIG.DEEP_VALIDATION_TIMEOUT,

      // Rate limiting disabled in test
      rateLimitEnabled: !isTest,
    },

    database: {
      // Smaller page size in test
      pageSize: isTest
        ? DB_CONFIG.PAGE_SIZE_SMALL
        : DB_CONFIG.PAGE_SIZE,

      // Shorter timeout in test
      timeout: isTest
        ? 5000
        : DB_CONFIG.TIMEOUT_MS,
    },

    features: {
      // All features enabled in production by default
      ...FEATURES,

      // Debug logging only in development
      ENABLE_DEBUG_LOGGING: isDevelopment,

      // Real-time updates disabled in test
      ENABLE_REAL_TIME_UPDATES: isProduction ? FEATURES.ENABLE_REAL_TIME_UPDATES : false,
    },

    phase7: getPhase7Config(),
  };
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate that all required environment variables are set
 * Call this on application startup
 */
export function validateConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required environment variables
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'ANTHROPIC_API_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate AI configuration
  if (AI_CONFIG.QUALITY_THRESHOLD < 0 || AI_CONFIG.QUALITY_THRESHOLD > 100) {
    errors.push('AI_CONFIG.QUALITY_THRESHOLD must be between 0 and 100');
  }

  // Validate timeouts
  if (AI_CONFIG.FAST_RESPONSE_TIMEOUT >= AI_CONFIG.DEEP_VALIDATION_TIMEOUT) {
    errors.push('AI_CONFIG.FAST_RESPONSE_TIMEOUT must be less than DEEP_VALIDATION_TIMEOUT');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Configuration type for the entire application
 */
export type AppConfig = ReturnType<typeof getConfig>;
