/**
 * TypeScript Enums for Type Safety
 * Alternative to const objects for stricter type checking in some scenarios
 *
 * Usage: Import specific enums when you need numeric enum values or stricter typing
 * Example: import { UserRoleEnum, NCAStatusEnum } from '@/lib/config/enums'
 *
 * Note: Prefer const objects (constants.ts) for most cases.
 * Use these enums only when you need:
 * 1. Numeric enum values
 * 2. Reverse mapping (value to key)
 * 3. Exhaustive switch case checking
 */

// ============================================================================
// USER ROLES ENUM
// ============================================================================

export enum UserRoleEnum {
  OPERATOR = 'operator',
  TEAM_LEADER = 'team-leader',
  MAINTENANCE_TECHNICIAN = 'maintenance-technician',
  QA_SUPERVISOR = 'qa-supervisor',
  MAINTENANCE_MANAGER = 'maintenance-manager',
  OPERATIONS_MANAGER = 'operations-manager',
}

// ============================================================================
// NCA STATUS ENUM
// ============================================================================

export enum NCAStatusEnum {
  SUBMITTED = 'submitted',
  IN_PROGRESS = 'in-progress',
  DISPOSITION_PENDING = 'disposition-pending',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// MJC STATUS ENUM
// ============================================================================

export enum MJCStatusEnum {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  HYGIENE_PENDING = 'hygiene-pending',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// MACHINE STATUS ENUM
// ============================================================================

export enum MachineStatusEnum {
  OPERATIONAL = 'operational',
  DOWN = 'down',
  UNDER_MAINTENANCE = 'under-maintenance',
}

// ============================================================================
// NC ORIGIN ENUM
// ============================================================================

export enum NCOriginEnum {
  SUPPLIER_BASED = 'supplier-based',
  KANGOPAK_BASED = 'kangopak-based',
  JOINT_INVESTIGATION = 'joint-investigation',
}

// ============================================================================
// NC TYPE ENUM
// ============================================================================

export enum NCTypeEnum {
  RAW_MATERIAL = 'raw-material',
  WIP = 'wip',
  FINISHED_GOODS = 'finished-goods',
  INCIDENT = 'incident',
  OTHER = 'other',
}

// ============================================================================
// DISPOSITION ACTION ENUM
// ============================================================================

export enum DispositionActionEnum {
  REJECT = 'reject',
  CREDIT = 'credit',
  UPLIFT = 'uplift',
  REWORK = 'rework',
  CONCESSION = 'concession',
  DISCARD = 'discard',
}

// ============================================================================
// MAINTENANCE CATEGORY ENUM
// ============================================================================

export enum MaintenanceCategoryEnum {
  REACTIVE = 'reactive',
  PLANNED = 'planned',
}

// ============================================================================
// MAINTENANCE TYPE ENUM
// ============================================================================

export enum MaintenanceTypeEnum {
  ELECTRICAL = 'electrical',
  MECHANICAL = 'mechanical',
  PNEUMATICAL = 'pneumatical',
  OTHER = 'other',
}

// ============================================================================
// URGENCY LEVEL ENUM
// ============================================================================

export enum UrgencyLevelEnum {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ============================================================================
// QUANTITY UNIT ENUM
// ============================================================================

export enum QuantityUnitEnum {
  KG = 'kg',
  UNITS = 'units',
  METERS = 'meters',
  BOXES = 'boxes',
  PALLETS = 'pallets',
}

// ============================================================================
// SEGREGATION AREA ENUM
// ============================================================================

export enum SegregationAreaEnum {
  RAW_MATERIALS = 'raw-materials',
  WIP = 'wip',
  FINISHED_GOODS = 'finished-goods',
  OTHER = 'other',
}

// ============================================================================
// WORK ORDER STATUS ENUM
// ============================================================================

export enum WorkOrderStatusEnum {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// SIGNATURE TYPE ENUM
// ============================================================================

export enum SignatureTypeEnum {
  MANUAL = 'manual',
  DIGITAL = 'digital',
}

// ============================================================================
// AI MODE ENUM
// ============================================================================

export enum AIModeEnum {
  FAST = 'fast',
  ADAPTIVE = 'adaptive',
  DEEP = 'deep',
}

// ============================================================================
// CONFIDENCE LEVEL ENUM
// ============================================================================

export enum ConfidenceLevelEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very-high',
}

// ============================================================================
// NOTIFICATION TYPE ENUM
// ============================================================================

export enum NotificationTypeEnum {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all enum values as an array
 */
export function getEnumValues<T extends Record<string, string | number>>(
  enumObj: T
): Array<T[keyof T]> {
  return Object.values(enumObj).filter(value => typeof value === 'string') as Array<T[keyof T]>;
}

/**
 * Check if a value is a valid enum value
 */
export function isValidEnum<T extends Record<string, string | number>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

/**
 * Get enum key from value
 */
export function getEnumKey<T extends Record<string, string>>(
  enumObj: T,
  value: string
): keyof T | undefined {
  const entry = Object.entries(enumObj).find(([_, v]) => v === value);
  return entry ? (entry[0] as keyof T) : undefined;
}

/**
 * Convert enum to select options
 * Useful for form dropdowns
 */
export function enumToSelectOptions<T extends Record<string, string>>(
  enumObj: T,
  labelFormatter?: (value: string) => string
): Array<{ value: T[keyof T]; label: string }> {
  return Object.values(enumObj).map((value) => ({
    value: value as T[keyof T],
    label: labelFormatter ? labelFormatter(value) : formatEnumLabel(value),
  }));
}

/**
 * Format enum value as human-readable label
 * Example: 'raw-material' -> 'Raw Material'
 */
export function formatEnumLabel(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
