/**
 * Application-wide Constants
 * Single source of truth for all configuration values and magic numbers
 * BRCGS Packaging Materials Issue 7 Compliance
 *
 * Usage: Import specific constants instead of hardcoding values
 * Example: import { USER_ROLES, VALIDATION } from '@/lib/config/constants'
 */

// ============================================================================
// USER ROLES (BRCGS-based role hierarchy)
// ============================================================================

export const USER_ROLES = {
  OPERATOR: 'operator',
  TEAM_LEADER: 'team-leader',
  MAINTENANCE_TECHNICIAN: 'maintenance-technician',
  QA_SUPERVISOR: 'qa-supervisor',
  MAINTENANCE_MANAGER: 'maintenance-manager',
  OPERATIONS_MANAGER: 'operations-manager',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Role hierarchy for permission checking
 * Lower index = lower permission level
 */
export const ROLE_HIERARCHY = [
  USER_ROLES.OPERATOR,
  USER_ROLES.TEAM_LEADER,
  USER_ROLES.MAINTENANCE_TECHNICIAN,
  USER_ROLES.QA_SUPERVISOR,
  USER_ROLES.MAINTENANCE_MANAGER,
  USER_ROLES.OPERATIONS_MANAGER,
] as const;

// ============================================================================
// NCA STATUS VALUES
// ============================================================================

export const NCA_STATUS = {
  SUBMITTED: 'submitted',
  IN_PROGRESS: 'in-progress',
  DISPOSITION_PENDING: 'disposition-pending',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export type NCAStatus = (typeof NCA_STATUS)[keyof typeof NCA_STATUS];

// ============================================================================
// MJC STATUS VALUES
// ============================================================================

export const MJC_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  HYGIENE_PENDING: 'hygiene-pending',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export type MJCStatus = (typeof MJC_STATUS)[keyof typeof MJC_STATUS];

// ============================================================================
// MACHINE STATUS
// ============================================================================

export const MACHINE_STATUS = {
  OPERATIONAL: 'operational',
  DOWN: 'down',
  UNDER_MAINTENANCE: 'under-maintenance',
} as const;

export type MachineStatus = (typeof MACHINE_STATUS)[keyof typeof MACHINE_STATUS];

// ============================================================================
// NC ORIGIN (Non-Conformance Origin)
// ============================================================================

export const NC_ORIGIN = {
  SUPPLIER_BASED: 'supplier-based',
  KANGOPAK_BASED: 'kangopak-based',
  JOINT_INVESTIGATION: 'joint-investigation',
} as const;

export type NCOrigin = (typeof NC_ORIGIN)[keyof typeof NC_ORIGIN];

// ============================================================================
// NC TYPE (Non-Conformance Type)
// ============================================================================

export const NC_TYPE = {
  RAW_MATERIAL: 'raw-material',
  WIP: 'wip',
  FINISHED_GOODS: 'finished-goods',
  INCIDENT: 'incident',
  OTHER: 'other',
} as const;

export type NCType = (typeof NC_TYPE)[keyof typeof NC_TYPE];

// ============================================================================
// DISPOSITION ACTIONS
// ============================================================================

export const DISPOSITION_ACTION = {
  REJECT: 'reject',
  CREDIT: 'credit',
  UPLIFT: 'uplift',
  REWORK: 'rework',
  CONCESSION: 'concession',
  DISCARD: 'discard',
} as const;

export type DispositionAction = (typeof DISPOSITION_ACTION)[keyof typeof DISPOSITION_ACTION];

// ============================================================================
// MAINTENANCE CATEGORIES
// ============================================================================

export const MAINTENANCE_CATEGORY = {
  REACTIVE: 'reactive',
  PLANNED: 'planned',
} as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORY)[keyof typeof MAINTENANCE_CATEGORY];

// ============================================================================
// MAINTENANCE TYPES
// ============================================================================

export const MAINTENANCE_TYPE = {
  ELECTRICAL: 'electrical',
  MECHANICAL: 'mechanical',
  PNEUMATICAL: 'pneumatical',
  OTHER: 'other',
} as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPE)[keyof typeof MAINTENANCE_TYPE];

// ============================================================================
// URGENCY LEVELS
// ============================================================================

export const URGENCY_LEVEL = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type UrgencyLevel = (typeof URGENCY_LEVEL)[keyof typeof URGENCY_LEVEL];

// ============================================================================
// QUANTITY UNITS
// ============================================================================

export const QUANTITY_UNIT = {
  KG: 'kg',
  UNITS: 'units',
  METERS: 'meters',
  BOXES: 'boxes',
  PALLETS: 'pallets',
} as const;

export type QuantityUnit = (typeof QUANTITY_UNIT)[keyof typeof QUANTITY_UNIT];

// ============================================================================
// SEGREGATION AREAS
// ============================================================================

export const SEGREGATION_AREA = {
  RAW_MATERIALS: 'raw-materials',
  WIP: 'wip',
  FINISHED_GOODS: 'finished-goods',
  OTHER: 'other',
} as const;

export type SegregationArea = (typeof SEGREGATION_AREA)[keyof typeof SEGREGATION_AREA];

// ============================================================================
// VALIDATION RULES (BRCGS Compliance)
// ============================================================================

export const VALIDATION = {
  // NCA Description Rules
  NCA_DESCRIPTION_MIN: 100,
  NCA_DESCRIPTION_MAX: 2000,

  // NCA Description Dynamic Minimums (by NC Type)
  NCA_DESCRIPTION_MIN_RAW_MATERIAL: 120,
  NCA_DESCRIPTION_MIN_FINISHED_GOODS: 150,
  NCA_DESCRIPTION_MIN_WIP: 130,
  NCA_DESCRIPTION_MIN_INCIDENT: 200,
  NCA_DESCRIPTION_MIN_OTHER: 100,

  // NCA Product Description Rules
  NCA_PRODUCT_DESCRIPTION_MIN: 10,
  NCA_PRODUCT_DESCRIPTION_MAX: 500,

  // MJC Description Rules
  MJC_DESCRIPTION_MIN: 100,
  MJC_DESCRIPTION_MAX: 2000,
  MJC_MACHINE_ID_MAX: 100,
  MJC_TYPE_OTHER_MIN: 10,

  // Rework Instruction Rules
  REWORK_INSTRUCTION_MIN: 20,

  // Record Number Formats
  NCA_NUMBER_FORMAT: 'NCA-YYYY-NNNNNNNN',
  MJC_NUMBER_FORMAT: 'MJC-YYYY-NNNNNNNN',

  // Hygiene Checklist
  HYGIENE_CHECKLIST_ITEMS: 10,

  // Root Cause Analysis Quality Rules
  RCA_MIN_WHY_COUNT: 3,
  RCA_MIN_SENTENCES: 2,

  // Corrective Action Quality Rules
  CA_MIN_ACTION_COUNT: 2,
} as const;

// ============================================================================
// AI CONFIGURATION
// ============================================================================

export const AI_CONFIG = {
  // Quality Thresholds
  QUALITY_THRESHOLD: 75,
  QUALITY_THRESHOLD_DEV: 50, // Lower threshold for development

  // Timeouts (milliseconds)
  FAST_RESPONSE_TIMEOUT: 2000, // 2 seconds for inline suggestions
  DEEP_VALIDATION_TIMEOUT: 30000, // 30 seconds for deep validation
  CORRECTIVE_ACTION_TIMEOUT: 10000, // 10 seconds for CA generation

  // Rate Limiting
  RATE_LIMIT_PER_MIN: 10,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute

  // Debouncing
  DEBOUNCE_MS: 3000,
  DEBOUNCE_INLINE_MS: 5000, // 5 seconds for inline quality checks

  // Model Configuration
  DEFAULT_MODEL: 'claude-sonnet-4-5-20250929',
  DEFAULT_TEMPERATURE: 0.3,
  DEFAULT_MAX_TOKENS: 4096,

  // Modes
  MODE_FAST: 'fast' as const,
  MODE_ADAPTIVE: 'adaptive' as const,
  MODE_DEEP: 'deep' as const,
} as const;

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

export const DB_CONFIG = {
  // Pagination
  PAGE_SIZE: 25,
  PAGE_SIZE_SMALL: 10,
  PAGE_SIZE_LARGE: 50,
  MAX_PAGE_SIZE: 100,

  // Timeouts
  TIMEOUT_MS: 10000, // 10 seconds for database queries

  // RLS Roles (for testing)
  SERVICE_ROLE_KEY_ENV: 'SUPABASE_SERVICE_ROLE_KEY',
  ANON_KEY_ENV: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURES = {
  // AI Features
  ENABLE_AI_QUALITY_GATE: true,
  ENABLE_AI_SUGGESTIONS: true,
  ENABLE_AI_ROOT_CAUSE_GENERATION: true,
  ENABLE_AI_CORRECTIVE_ACTION_GENERATION: true,

  // Advanced Features
  ENABLE_SUPPLIER_PERFORMANCE: true,
  ENABLE_CROSS_REFERENCE: true,
  ENABLE_TREND_ANALYSIS: true,
  ENABLE_WASTE_RECONCILIATION: true,

  // Performance Features
  ENABLE_LAZY_LOADING: true,
  ENABLE_REAL_TIME_UPDATES: false, // Disable for MVP
  ENABLE_OPTIMISTIC_UPDATES: true,

  // Development Features
  ENABLE_DEBUG_LOGGING: false,
  ENABLE_PERFORMANCE_MONITORING: true,
} as const;

// ============================================================================
// TIMEOUTS & DEADLINES (BRCGS Compliance)
// ============================================================================

export const TIMEOUTS = {
  // BRCGS Requirements
  NCA_CLOSURE_DAYS: 20, // BRCGS 5.7 requirement
  MJC_TEMPORARY_REPAIR_DAYS: 14, // 14 days for temporary repairs

  // Notification Retries
  NOTIFICATION_RETRY_MS: 5000, // 5 seconds
  NOTIFICATION_MAX_RETRIES: 3,

  // Working Days Calculation
  WORKING_DAYS_PER_WEEK: 5,
  WEEKEND_DAYS: [0, 6] as const, // Sunday = 0, Saturday = 6
} as const;

// ============================================================================
// BRCGS PROCEDURE REFERENCES
// ============================================================================

export const BRCGS_PROCEDURES = {
  // Main Procedures
  NCA_PROCEDURE: '5.7',
  NCA_REVISION: 'Rev 9',
  MJC_PROCEDURE: '5.6',
  MJC_REVISION: 'Rev 8',

  // Related Sections
  DOCUMENT_CONTROL: '3.6',
  AUDIT_TRAIL: '3.3',
  TRACEABILITY: '3.9',
  COMPLAINT_HANDLING: '3.10',
  PRODUCT_RECALL: '3.11',
  WASTE_RECONCILIATION: '4.10',
  SUPPLIER_QUALITY: '3.4',
  CONFIDENTIAL_REPORTING: '1.1.3',
} as const;

// ============================================================================
// EMAIL & NOTIFICATION CONFIGURATION
// ============================================================================

export const EMAIL_CONFIG = {
  // Recipient Groups
  MACHINE_DOWN_RECIPIENTS: ['maintenance@kangopak.co.za', 'operations@kangopak.co.za'],
  NCA_ALERT_RECIPIENTS: ['quality@kangopak.co.za', 'operations@kangopak.co.za'],
  SUPPLIER_NCA_RECIPIENTS: ['procurement@kangopak.co.za', 'quality@kangopak.co.za'],

  // Email Settings
  FROM_EMAIL: 'noreply@kangopak.co.za',
  FROM_NAME: 'OHiSee System',
} as const;

// ============================================================================
// SIGNATURE TYPES
// ============================================================================

export const SIGNATURE_TYPE = {
  MANUAL: 'manual',
  DIGITAL: 'digital',
} as const;

export type SignatureType = (typeof SIGNATURE_TYPE)[keyof typeof SIGNATURE_TYPE];

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

export const FILE_CONFIG = {
  // Allowed MIME types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const,

  // File size limits (bytes)
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB

  // Storage paths
  NCA_ATTACHMENTS_PATH: 'nca-attachments',
  MJC_ATTACHMENTS_PATH: 'mjc-attachments',
} as const;

// ============================================================================
// WORK ORDER STATUS
// ============================================================================

export const WORK_ORDER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUS)[keyof typeof WORK_ORDER_STATUS];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all values from a const object as an array
 * Useful for Zod enum creation
 */
export function getConstValues<T extends Record<string, string>>(obj: T): T[keyof T][] {
  return Object.values(obj) as T[keyof T][];
}

/**
 * Check if a value is a valid enum value
 */
export function isValidEnumValue<T extends Record<string, string>>(
  obj: T,
  value: unknown
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(obj).includes(value);
}

/**
 * Get role hierarchy level (0 = lowest, 5 = highest)
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if user role has sufficient permissions
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}
