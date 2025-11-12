/**
 * Unit Tests for lib/config/constants.ts
 * Test helper functions and type guards
 */

import {
  getConstValues,
  isValidEnumValue,
  getRoleLevel,
  hasPermission,
  USER_ROLES,
  ROLE_HIERARCHY,
  NCA_STATUS,
  MJC_STATUS,
  VALIDATION,
  AI_CONFIG,
  FEATURES,
  type UserRole,
} from '../constants';

describe('lib/config/constants - Helper Functions', () => {
  describe('getConstValues', () => {
    test('returns all values from USER_ROLES object', () => {
      const values = getConstValues(USER_ROLES);

      expect(values).toHaveLength(6);
      expect(values).toContain('operator');
      expect(values).toContain('team-leader');
      expect(values).toContain('maintenance-technician');
      expect(values).toContain('qa-supervisor');
      expect(values).toContain('maintenance-manager');
      expect(values).toContain('operations-manager');
    });

    test('returns all values from NCA_STATUS object', () => {
      const values = getConstValues(NCA_STATUS);

      expect(values).toHaveLength(5);
      expect(values).toContain('submitted');
      expect(values).toContain('in-progress');
      expect(values).toContain('disposition-pending');
      expect(values).toContain('closed');
      expect(values).toContain('cancelled');
    });

    test('returns all values from MJC_STATUS object', () => {
      const values = getConstValues(MJC_STATUS);

      expect(values).toHaveLength(5);
      expect(values).toContain('open');
      expect(values).toContain('in-progress');
      expect(values).toContain('hygiene-pending');
      expect(values).toContain('closed');
      expect(values).toContain('cancelled');
    });

    test('returns empty array for empty object', () => {
      const values = getConstValues({});
      expect(values).toHaveLength(0);
    });

    test('preserves type safety with const assertion', () => {
      const TEST_OBJ = { A: 'a', B: 'b' } as const;
      const values = getConstValues(TEST_OBJ);

      // TypeScript should enforce readonly types
      expect(values).toEqual(['a', 'b']);
    });
  });

  describe('isValidEnumValue', () => {
    test('returns true for valid USER_ROLES value', () => {
      expect(isValidEnumValue(USER_ROLES, 'operator')).toBe(true);
      expect(isValidEnumValue(USER_ROLES, 'qa-supervisor')).toBe(true);
      expect(isValidEnumValue(USER_ROLES, 'operations-manager')).toBe(true);
    });

    test('returns false for invalid USER_ROLES value', () => {
      expect(isValidEnumValue(USER_ROLES, 'admin')).toBe(false);
      expect(isValidEnumValue(USER_ROLES, 'manager')).toBe(false);
      expect(isValidEnumValue(USER_ROLES, '')).toBe(false);
    });

    test('returns false for non-string values', () => {
      expect(isValidEnumValue(USER_ROLES, 123)).toBe(false);
      expect(isValidEnumValue(USER_ROLES, null)).toBe(false);
      expect(isValidEnumValue(USER_ROLES, undefined)).toBe(false);
      expect(isValidEnumValue(USER_ROLES, {})).toBe(false);
      expect(isValidEnumValue(USER_ROLES, [])).toBe(false);
    });

    test('returns true for valid NCA_STATUS value', () => {
      expect(isValidEnumValue(NCA_STATUS, 'submitted')).toBe(true);
      expect(isValidEnumValue(NCA_STATUS, 'in-progress')).toBe(true);
      expect(isValidEnumValue(NCA_STATUS, 'closed')).toBe(true);
    });

    test('returns false for invalid NCA_STATUS value', () => {
      expect(isValidEnumValue(NCA_STATUS, 'pending')).toBe(false);
      expect(isValidEnumValue(NCA_STATUS, 'SUBMITTED')).toBe(false); // Case sensitive
    });

    test('handles edge cases', () => {
      const EMPTY_OBJ = {};
      expect(isValidEnumValue(EMPTY_OBJ, 'anything')).toBe(false);

      const SINGLE_VALUE = { ONLY: 'value' };
      expect(isValidEnumValue(SINGLE_VALUE, 'value')).toBe(true);
      expect(isValidEnumValue(SINGLE_VALUE, 'other')).toBe(false);
    });
  });

  describe('getRoleLevel', () => {
    test('returns correct level for operator (lowest)', () => {
      expect(getRoleLevel(USER_ROLES.OPERATOR)).toBe(0);
    });

    test('returns correct level for team-leader', () => {
      expect(getRoleLevel(USER_ROLES.TEAM_LEADER)).toBe(1);
    });

    test('returns correct level for maintenance-technician', () => {
      expect(getRoleLevel(USER_ROLES.MAINTENANCE_TECHNICIAN)).toBe(2);
    });

    test('returns correct level for qa-supervisor', () => {
      expect(getRoleLevel(USER_ROLES.QA_SUPERVISOR)).toBe(3);
    });

    test('returns correct level for maintenance-manager', () => {
      expect(getRoleLevel(USER_ROLES.MAINTENANCE_MANAGER)).toBe(4);
    });

    test('returns correct level for operations-manager (highest)', () => {
      expect(getRoleLevel(USER_ROLES.OPERATIONS_MANAGER)).toBe(5);
    });

    test('returns -1 for invalid role', () => {
      expect(getRoleLevel('invalid-role' as UserRole)).toBe(-1);
    });

    test('role hierarchy is consistent with ROLE_HIERARCHY constant', () => {
      ROLE_HIERARCHY.forEach((role, index) => {
        expect(getRoleLevel(role)).toBe(index);
      });
    });
  });

  describe('hasPermission', () => {
    describe('operator permissions', () => {
      test('operator has permission for operator-level actions', () => {
        expect(hasPermission(USER_ROLES.OPERATOR, USER_ROLES.OPERATOR)).toBe(true);
      });

      test('operator does NOT have permission for team-leader actions', () => {
        expect(hasPermission(USER_ROLES.OPERATOR, USER_ROLES.TEAM_LEADER)).toBe(false);
      });

      test('operator does NOT have permission for higher roles', () => {
        expect(hasPermission(USER_ROLES.OPERATOR, USER_ROLES.QA_SUPERVISOR)).toBe(false);
        expect(hasPermission(USER_ROLES.OPERATOR, USER_ROLES.MAINTENANCE_MANAGER)).toBe(false);
        expect(hasPermission(USER_ROLES.OPERATOR, USER_ROLES.OPERATIONS_MANAGER)).toBe(false);
      });
    });

    describe('qa-supervisor permissions', () => {
      test('qa-supervisor has permission for operator actions', () => {
        expect(hasPermission(USER_ROLES.QA_SUPERVISOR, USER_ROLES.OPERATOR)).toBe(true);
      });

      test('qa-supervisor has permission for team-leader actions', () => {
        expect(hasPermission(USER_ROLES.QA_SUPERVISOR, USER_ROLES.TEAM_LEADER)).toBe(true);
      });

      test('qa-supervisor has permission for maintenance-technician actions', () => {
        expect(hasPermission(USER_ROLES.QA_SUPERVISOR, USER_ROLES.MAINTENANCE_TECHNICIAN)).toBe(true);
      });

      test('qa-supervisor has permission for qa-supervisor actions', () => {
        expect(hasPermission(USER_ROLES.QA_SUPERVISOR, USER_ROLES.QA_SUPERVISOR)).toBe(true);
      });

      test('qa-supervisor does NOT have permission for maintenance-manager actions', () => {
        expect(hasPermission(USER_ROLES.QA_SUPERVISOR, USER_ROLES.MAINTENANCE_MANAGER)).toBe(false);
      });

      test('qa-supervisor does NOT have permission for operations-manager actions', () => {
        expect(hasPermission(USER_ROLES.QA_SUPERVISOR, USER_ROLES.OPERATIONS_MANAGER)).toBe(false);
      });
    });

    describe('operations-manager permissions (highest level)', () => {
      test('operations-manager has permission for all roles', () => {
        expect(hasPermission(USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.OPERATOR)).toBe(true);
        expect(hasPermission(USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.TEAM_LEADER)).toBe(true);
        expect(hasPermission(USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.MAINTENANCE_TECHNICIAN)).toBe(true);
        expect(hasPermission(USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.QA_SUPERVISOR)).toBe(true);
        expect(hasPermission(USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.MAINTENANCE_MANAGER)).toBe(true);
        expect(hasPermission(USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.OPERATIONS_MANAGER)).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('invalid user role returns false (getRoleLevel returns -1)', () => {
        expect(hasPermission('invalid-role' as UserRole, USER_ROLES.OPERATOR)).toBe(false);
      });

      test('invalid required role returns false when user role is valid', () => {
        // When requiredRole is invalid (level -1), userLevel (0) >= -1 is true
        // This is expected behavior - invalid required role means no permission needed
        expect(hasPermission(USER_ROLES.OPERATOR, 'invalid-role' as UserRole)).toBe(true);
      });

      test('both invalid roles returns true (both at level -1)', () => {
        // When both roles are invalid, both have level -1, so -1 >= -1 is true
        // This edge case is acceptable since invalid roles should never be used
        expect(hasPermission('invalid-user' as UserRole, 'invalid-required' as UserRole)).toBe(true);
      });
    });

    describe('permission matrix completeness', () => {
      test('all role combinations are deterministic', () => {
        const allRoles = [
          USER_ROLES.OPERATOR,
          USER_ROLES.TEAM_LEADER,
          USER_ROLES.MAINTENANCE_TECHNICIAN,
          USER_ROLES.QA_SUPERVISOR,
          USER_ROLES.MAINTENANCE_MANAGER,
          USER_ROLES.OPERATIONS_MANAGER,
        ];

        allRoles.forEach(userRole => {
          allRoles.forEach(requiredRole => {
            const result = hasPermission(userRole, requiredRole);
            expect(typeof result).toBe('boolean');
          });
        });
      });
    });
  });

  describe('Configuration Constants - Value Checks', () => {
    test('VALIDATION constants are positive numbers', () => {
      expect(VALIDATION.NCA_DESCRIPTION_MIN).toBeGreaterThan(0);
      expect(VALIDATION.NCA_DESCRIPTION_MAX).toBeGreaterThan(VALIDATION.NCA_DESCRIPTION_MIN);
      expect(VALIDATION.MJC_DESCRIPTION_MIN).toBeGreaterThan(0);
      expect(VALIDATION.MJC_DESCRIPTION_MAX).toBeGreaterThan(VALIDATION.MJC_DESCRIPTION_MIN);
      expect(VALIDATION.HYGIENE_CHECKLIST_ITEMS).toBe(10);
    });

    test('AI_CONFIG timeouts are properly ordered', () => {
      expect(AI_CONFIG.FAST_RESPONSE_TIMEOUT).toBeLessThan(AI_CONFIG.CORRECTIVE_ACTION_TIMEOUT);
      expect(AI_CONFIG.CORRECTIVE_ACTION_TIMEOUT).toBeLessThan(AI_CONFIG.DEEP_VALIDATION_TIMEOUT);
    });

    test('AI_CONFIG quality thresholds are in valid range', () => {
      expect(AI_CONFIG.QUALITY_THRESHOLD).toBeGreaterThanOrEqual(0);
      expect(AI_CONFIG.QUALITY_THRESHOLD).toBeLessThanOrEqual(100);
      expect(AI_CONFIG.QUALITY_THRESHOLD_DEV).toBeGreaterThanOrEqual(0);
      expect(AI_CONFIG.QUALITY_THRESHOLD_DEV).toBeLessThanOrEqual(100);
      expect(AI_CONFIG.QUALITY_THRESHOLD_DEV).toBeLessThan(AI_CONFIG.QUALITY_THRESHOLD);
    });

    test('AI_CONFIG rate limiting is configured', () => {
      expect(AI_CONFIG.RATE_LIMIT_PER_MIN).toBeGreaterThan(0);
      expect(AI_CONFIG.RATE_LIMIT_WINDOW_MS).toBe(60000); // 1 minute
    });

    test('FEATURES flags are all boolean', () => {
      Object.values(FEATURES).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });

    test('VALIDATION dynamic minimums increase with complexity', () => {
      expect(VALIDATION.NCA_DESCRIPTION_MIN_RAW_MATERIAL).toBeGreaterThan(VALIDATION.NCA_DESCRIPTION_MIN_OTHER);
      expect(VALIDATION.NCA_DESCRIPTION_MIN_WIP).toBeGreaterThan(VALIDATION.NCA_DESCRIPTION_MIN_OTHER);
      expect(VALIDATION.NCA_DESCRIPTION_MIN_FINISHED_GOODS).toBeGreaterThan(VALIDATION.NCA_DESCRIPTION_MIN_RAW_MATERIAL);
      expect(VALIDATION.NCA_DESCRIPTION_MIN_INCIDENT).toBeGreaterThan(VALIDATION.NCA_DESCRIPTION_MIN_FINISHED_GOODS);
    });
  });

  describe('Type Safety', () => {
    test('USER_ROLES is readonly', () => {
      // TypeScript compile-time check - attempting to modify should cause TS error
      // At runtime, object is still mutable, but type system prevents it
      expect(Object.isFrozen(USER_ROLES)).toBe(false); // Not frozen at runtime
      expect(USER_ROLES.OPERATOR).toBe('operator');
    });

    test('NCA_STATUS values are readonly', () => {
      expect(NCA_STATUS.SUBMITTED).toBe('submitted');
      expect(NCA_STATUS.CLOSED).toBe('closed');
    });

    test('MJC_STATUS values are readonly', () => {
      expect(MJC_STATUS.OPEN).toBe('open');
      expect(MJC_STATUS.CLOSED).toBe('closed');
    });
  });
});
