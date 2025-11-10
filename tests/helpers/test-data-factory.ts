/**
 * Test Data Factory
 * Generates valid test data for MJCs, NCAs, users, machines, and work orders
 *
 * All factories create data that passes database constraints
 */

import type {
  UserRole,
  Department,
  MachineStatus,
  MaintenanceCategory,
  MJCUrgency,
  NCType,
  QuantityUnit,
  HygieneChecklistItem,
  UserInsert,
  MachineInsert,
  WorkOrderInsert,
  MJCInsert,
  NCAInsert,
  Signature,
} from '../../types/database';

// =============================================================================
// User Factory
// =============================================================================

export interface TestUserOptions {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  department?: Department | null;
  active?: boolean;
}

/**
 * Creates a test user with valid data
 * @param options - Optional overrides for user fields
 * @returns {UserInsert} Valid user insert object
 */
export function createTestUser(options: TestUserOptions = {}): UserInsert {
  const role = options.role ?? 'operator';
  const timestamp = Date.now();

  return {
    id: options.id ?? crypto.randomUUID(),
    email: options.email ?? `test-${role}-${timestamp}@test.com`,
    name: options.name ?? `Test ${role.replace('-', ' ')} ${timestamp}`,
    role,
    department: options.department ?? 'pouching',
    active: options.active ?? true,
  };
}

/**
 * Creates multiple test users with different roles
 * @returns {Record<UserRole, UserInsert>} Map of role to user
 */
export function createTestUsersByRole(): Record<UserRole, UserInsert> {
  const roles: UserRole[] = [
    'operator',
    'team-leader',
    'maintenance-technician',
    'qa-supervisor',
    'maintenance-manager',
    'operations-manager',
  ];

  return roles.reduce(
    (acc, role) => {
      acc[role] = createTestUser({ role });
      return acc;
    },
    {} as Record<UserRole, UserInsert>
  );
}

// =============================================================================
// Machine Factory
// =============================================================================

export interface TestMachineOptions {
  id?: string;
  machine_code?: string;
  machine_name?: string;
  department?: Department;
  status?: MachineStatus;
  location?: string | null;
}

/**
 * Creates a test machine with valid data
 * @param options - Optional overrides for machine fields
 * @returns {MachineInsert} Valid machine insert object
 */
export function createTestMachine(
  options: TestMachineOptions = {}
): MachineInsert {
  const timestamp = Date.now();

  return {
    id: options.id ?? crypto.randomUUID(),
    machine_code: options.machine_code ?? `TEST-MACH-${timestamp}`,
    machine_name: options.machine_name ?? `Test Machine ${timestamp}`,
    department: options.department ?? 'pouching',
    status: options.status ?? 'operational',
    location: options.location ?? 'Test Location',
  };
}

// =============================================================================
// Work Order Factory
// =============================================================================

export interface TestWorkOrderOptions {
  id?: string;
  wo_number?: string;
  machine_id?: string | null;
  operator_id?: string | null;
  department?: Department;
  product_description?: string | null;
  batch_number?: string | null;
}

/**
 * Creates a test work order with valid data
 * @param options - Optional overrides for work order fields
 * @returns {WorkOrderInsert} Valid work order insert object
 */
export function createTestWorkOrder(
  options: TestWorkOrderOptions = {}
): WorkOrderInsert {
  const timestamp = Date.now();

  return {
    id: options.id ?? crypto.randomUUID(),
    wo_number: options.wo_number ?? `WO-TEST-${timestamp}`,
    machine_id: options.machine_id ?? null,
    operator_id: options.operator_id ?? null,
    start_timestamp: new Date().toISOString(),
    status: 'active',
    department: options.department ?? 'pouching',
    product_description: options.product_description ?? 'Test Product',
    batch_number: options.batch_number ?? `BATCH-${timestamp}`,
  };
}

// =============================================================================
// MJC Factory
// =============================================================================

export interface TestMJCOptions {
  raised_by_user_id?: string;
  created_by?: string;
  department?: Department;
  machine_equipment?: string;
  machine_id?: string | null;
  maintenance_category?: MaintenanceCategory;
  machine_status?: 'down' | 'operational';
  urgency?: MJCUrgency;
  description_required?: string;
  maintenance_type_electrical?: boolean;
  maintenance_type_mechanical?: boolean;
  maintenance_type_pneumatical?: boolean;
  status?: 'draft' | 'open' | 'assigned' | 'in-progress' | 'awaiting-clearance' | 'closed';
}

/**
 * Creates a test MJC with valid data (passes all constraints)
 * @param userId - User ID for raised_by and created_by fields
 * @param options - Optional overrides for MJC fields
 * @returns {MJCInsert} Valid MJC insert object
 */
export function createTestMJC(
  userId: string,
  options: TestMJCOptions = {}
): MJCInsert {
  const timestamp = Date.now();

  return {
    raised_by_user_id: options.raised_by_user_id ?? userId,
    created_by: options.created_by ?? userId,
    department: options.department ?? 'pouching',
    machine_equipment: options.machine_equipment ?? `Test Machine ${timestamp}`,
    machine_id: options.machine_id ?? null,
    maintenance_category: options.maintenance_category ?? 'reactive',
    machine_status: options.machine_status ?? 'operational',
    urgency: options.urgency ?? 'low',
    // Must be at least 50 characters (database constraint)
    description_required:
      options.description_required ??
      'Test maintenance description that meets the minimum 50 character requirement for database validation.',
    maintenance_type_electrical: options.maintenance_type_electrical ?? true,
    maintenance_type_mechanical: options.maintenance_type_mechanical ?? false,
    maintenance_type_pneumatical: options.maintenance_type_pneumatical ?? false,
    status: options.status ?? 'draft',
  };
}

// =============================================================================
// NCA Factory
// =============================================================================

export interface TestNCAOptions {
  raised_by_user_id?: string;
  created_by?: string;
  nc_type?: NCType;
  nc_product_description?: string;
  nc_description?: string;
  machine_status?: 'down' | 'operational';
  cross_contamination?: boolean;
  hold_label_completed?: boolean;
  sample_available?: boolean;
  quantity?: number | null;
  quantity_unit?: QuantityUnit | null;
  status?: 'draft' | 'submitted' | 'under-review' | 'closed';
}

/**
 * Creates a test NCA with valid data (passes all constraints)
 * @param userId - User ID for raised_by and created_by fields
 * @param options - Optional overrides for NCA fields
 * @returns {NCAInsert} Valid NCA insert object
 */
export function createTestNCA(
  userId: string,
  options: TestNCAOptions = {}
): NCAInsert {
  const timestamp = Date.now();

  return {
    raised_by_user_id: options.raised_by_user_id ?? userId,
    created_by: options.created_by ?? userId,
    nc_type: options.nc_type ?? 'wip',
    nc_product_description:
      options.nc_product_description ?? `Test Product ${timestamp}`,
    // Must be at least 100 characters (database constraint)
    nc_description:
      options.nc_description ??
      'Test non-conformance description that meets the minimum 100 character requirement for database validation and compliance.',
    machine_status: options.machine_status ?? 'operational',
    cross_contamination: options.cross_contamination ?? false,
    hold_label_completed: options.hold_label_completed ?? true,
    sample_available: options.sample_available ?? false,
    quantity: options.quantity ?? null,
    quantity_unit: options.quantity_unit ?? null,
    status: options.status ?? 'draft',
  };
}

// =============================================================================
// Hygiene Checklist Factory (BRCGS Compliance)
// =============================================================================

/**
 * Creates a complete hygiene checklist with all 10 required items
 * @param allVerified - Whether all items should be verified (default: false)
 * @returns {HygieneChecklistItem[]} Complete checklist array
 */
export function createHygieneChecklist(
  allVerified: boolean = false
): HygieneChecklistItem[] {
  const items = [
    'All Excess Grease & Oil Removed',
    'All Swarf & Debris Removed',
    'Machine Surfaces Wiped Clean',
    'No Foreign Objects in Machine',
    'Guards & Covers Replaced',
    'Floor Area Around Machine Clean',
    'Tools & Equipment Removed from Site',
    'Waste Materials Disposed of Properly',
    'Product Contact Surfaces Sanitized',
    'Visual Inspection Complete',
  ];

  return items.map((item) => ({
    item,
    verified: allVerified,
    notes: '',
  }));
}

// =============================================================================
// Signature Factory
// =============================================================================

export interface TestSignatureOptions {
  type?: 'login' | 'drawn' | 'uploaded';
  name?: string;
  timestamp?: string;
  ip?: string;
  data?: string;
}

/**
 * Creates a test signature object
 * @param options - Optional overrides for signature fields
 * @returns {Signature} Valid signature object
 */
export function createTestSignature(
  options: TestSignatureOptions = {}
): Signature {
  return {
    type: options.type ?? 'login',
    name: options.name ?? 'Test User',
    timestamp: options.timestamp ?? new Date().toISOString(),
    ip: options.ip ?? '127.0.0.1',
    data: options.data ?? undefined,
  };
}

// =============================================================================
// Batch Creation Utilities
// =============================================================================

/**
 * Creates a complete test scenario with user, machine, work order, and MJC
 * @returns {Promise<TestScenario>} Complete test scenario
 */
export interface TestScenario {
  user: UserInsert;
  machine: MachineInsert;
  workOrder: WorkOrderInsert;
  mjc: MJCInsert;
}

export function createTestScenario(): TestScenario {
  const user = createTestUser({ role: 'operator' });
  const machine = createTestMachine({ department: 'pouching' });
  const workOrder = createTestWorkOrder({
    machine_id: machine.id,
    operator_id: user.id,
    department: 'pouching',
  });
  const mjc = createTestMJC(user.id!, {
    machine_id: machine.id,
    department: 'pouching',
  });

  return { user, machine, workOrder, mjc };
}

/**
 * Creates multiple test users for integration testing
 * @param count - Number of users to create
 * @param role - Role for all users (default: 'operator')
 * @returns {UserInsert[]} Array of test users
 */
export function createTestUsers(count: number, role: UserRole = 'operator'): UserInsert[] {
  return Array.from({ length: count }, () => createTestUser({ role }));
}

/**
 * Creates multiple test MJCs for load testing
 * @param userId - User ID for all MJCs
 * @param count - Number of MJCs to create
 * @returns {MJCInsert[]} Array of test MJCs
 */
export function createTestMJCs(userId: string, count: number): MJCInsert[] {
  return Array.from({ length: count }, () => createTestMJC(userId));
}

/**
 * Creates multiple test NCAs for load testing
 * @param userId - User ID for all NCAs
 * @param count - Number of NCAs to create
 * @returns {NCAInsert[]} Array of test NCAs
 */
export function createTestNCAs(userId: string, count: number): NCAInsert[] {
  return Array.from({ length: count }, () => createTestNCA(userId));
}
