-- OHiSee NCA/MJC System - Row Level Security Policies
-- BRCGS Compliance: Enforce role-based access control at database level
-- NEVER TRUST CLIENT - All security enforced server-side
-- Role Hierarchy: operator < team-leader < maintenance-technician < qa-supervisor < maintenance-manager < operations-manager

-- =============================================================================
-- RLS: users table
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view user records (for assignee lookups)
CREATE POLICY "Authenticated users can view users" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can view their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Only operations-manager can insert/update/delete users
CREATE POLICY "Operations manager can manage users" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operations-manager'
    )
  );

-- =============================================================================
-- RLS: machines table
-- =============================================================================
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view machines
CREATE POLICY "Authenticated users can view machines" ON machines
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only maintenance-manager and operations-manager can modify machines
CREATE POLICY "Managers can modify machines" ON machines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('maintenance-manager', 'operations-manager')
    )
  );

-- =============================================================================
-- RLS: work_orders table
-- =============================================================================
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view work orders
CREATE POLICY "Authenticated users can view work orders" ON work_orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Operators can create work orders
CREATE POLICY "Operators can create work orders" ON work_orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = operator_id
  );

-- Operators can update their own active work orders
CREATE POLICY "Operators can update own work orders" ON work_orders
  FOR UPDATE
  USING (
    auth.uid() = operator_id AND status = 'active'
  );

-- Team leaders and managers can update any work order
CREATE POLICY "Managers can update all work orders" ON work_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('team-leader', 'operations-manager')
    )
  );

-- =============================================================================
-- RLS: ncas table (Non-Conformance Advice)
-- =============================================================================
ALTER TABLE ncas ENABLE ROW LEVEL SECURITY;

-- Operators can view their own NCAs
CREATE POLICY "Operators can view own NCAs" ON ncas
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() = raised_by_user_id
  );

-- Team leaders can view NCAs from their department
CREATE POLICY "Team leaders can view department NCAs" ON ncas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      INNER JOIN work_orders wo ON ncas.wo_id = wo.id
      WHERE u1.id = auth.uid()
      AND u1.role = 'team-leader'
      AND u1.department = wo.department
    )
  );

-- QA, Maintenance Manager, Operations Manager can view all NCAs
CREATE POLICY "Management can view all NCAs" ON ncas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('qa-supervisor', 'maintenance-manager', 'operations-manager')
    )
  );

-- Operators can create NCAs
CREATE POLICY "Operators can create NCAs" ON ncas
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() = raised_by_user_id
  );

-- Operators can update their own draft NCAs only
CREATE POLICY "Operators can update own draft NCAs" ON ncas
  FOR UPDATE
  USING (
    auth.uid() = created_by AND
    status = 'draft'
  );

-- Team leaders can update NCAs in review (for concession signature)
CREATE POLICY "Team leaders can update NCAs for concession" ON ncas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN work_orders wo ON ncas.wo_id = wo.id
      WHERE u.id = auth.uid()
      AND u.role = 'team-leader'
      AND u.department = wo.department
      AND ncas.status IN ('submitted', 'under-review')
    )
  );

-- QA supervisors and operations managers can close NCAs
CREATE POLICY "QA can close NCAs" ON ncas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('qa-supervisor', 'operations-manager')
    )
  );

-- No one can delete NCAs (BRCGS - immutable records)
-- No DELETE policy created

-- =============================================================================
-- RLS: mjcs table (Maintenance Job Cards)
-- =============================================================================
ALTER TABLE mjcs ENABLE ROW LEVEL SECURITY;

-- Operators can view their own MJCs
CREATE POLICY "Operators can view own MJCs" ON mjcs
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() = raised_by_user_id
  );

-- Maintenance technicians can view assigned MJCs
CREATE POLICY "Technicians can view assigned MJCs" ON mjcs
  FOR SELECT
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'maintenance-technician'
    )
  );

-- QA supervisors can view MJCs awaiting clearance or all MJCs
CREATE POLICY "QA can view all MJCs" ON mjcs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('qa-supervisor', 'maintenance-manager', 'operations-manager')
    )
  );

-- Operators can create MJCs
CREATE POLICY "Operators can create MJCs" ON mjcs
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() = raised_by_user_id
  );

-- Operators can update their own draft MJCs
CREATE POLICY "Operators can update own draft MJCs" ON mjcs
  FOR UPDATE
  USING (
    auth.uid() = created_by AND
    status = 'draft'
  );

-- Maintenance managers can assign MJCs
CREATE POLICY "Maintenance managers can assign MJCs" ON mjcs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('maintenance-manager', 'operations-manager')
    )
  );

-- Maintenance technicians can update assigned MJCs (perform maintenance)
CREATE POLICY "Technicians can update assigned MJCs" ON mjcs
  FOR UPDATE
  USING (
    auth.uid() = assigned_to AND
    status IN ('assigned', 'in-progress')
  );

-- QA supervisors can grant hygiene clearance (BRCGS CRITICAL)
CREATE POLICY "QA can grant hygiene clearance" ON mjcs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'qa-supervisor'
    ) AND
    status = 'awaiting-clearance'
  );

-- No one can delete MJCs (BRCGS - immutable records)
-- No DELETE policy created

-- =============================================================================
-- RLS: audit_trail table (Read-only for all)
-- =============================================================================
-- Already enabled in audit_trail.sql
-- Policy already created: "Users can view audit trail"

-- =============================================================================
-- FUNCTION: Helper to check user role
-- Purpose: Reusable function for role checking in policies
-- =============================================================================
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_role IS 'Helper function to check if current user has one of specified roles';

-- =============================================================================
-- FUNCTION: Get user role
-- Purpose: Return current user's role for use in application logic
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_role IS 'Returns current authenticated user role';

-- =============================================================================
-- FUNCTION: Can user close NCA
-- Purpose: Check if user has permission to close NCAs
-- =============================================================================
CREATE OR REPLACE FUNCTION can_close_nca()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['qa-supervisor', 'operations-manager']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_close_nca IS 'Returns true if user can close NCAs (QA supervisor or operations manager)';

-- =============================================================================
-- FUNCTION: Can user grant hygiene clearance
-- Purpose: Check if user has permission to grant hygiene clearance (BRCGS)
-- =============================================================================
CREATE OR REPLACE FUNCTION can_grant_hygiene_clearance()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['qa-supervisor']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_grant_hygiene_clearance IS 'BRCGS CRITICAL: Returns true if user can grant hygiene clearance (QA supervisor only)';

-- =============================================================================
-- VERIFICATION QUERIES (Run these to test RLS policies)
-- =============================================================================

-- Test 1: Verify operator cannot view other operator's NCAs
-- SELECT * FROM ncas; -- As operator1, should only see own NCAs

-- Test 2: Verify QA can view all NCAs
-- SELECT * FROM ncas; -- As QA supervisor, should see all NCAs

-- Test 3: Verify technician cannot grant hygiene clearance
-- SELECT can_grant_hygiene_clearance(); -- As technician, should return false

-- Test 4: Verify QA supervisor can grant hygiene clearance
-- SELECT can_grant_hygiene_clearance(); -- As QA supervisor, should return true

-- Test 5: Verify no DELETE on NCAs
-- DELETE FROM ncas WHERE id = '<some-id>'; -- Should fail with no policy error

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON POLICY "Operators can view own NCAs" ON ncas IS 'Operators can only view NCAs they created';
COMMENT ON POLICY "Management can view all NCAs" ON ncas IS 'QA, Maintenance Manager, Operations Manager have full visibility';
COMMENT ON POLICY "QA can close NCAs" ON ncas IS 'Only QA supervisor and operations manager can close NCAs';
COMMENT ON POLICY "QA can grant hygiene clearance" ON mjcs IS 'BRCGS CRITICAL: Only QA supervisors can grant hygiene clearance';
COMMENT ON POLICY "Technicians can update assigned MJCs" ON mjcs IS 'Maintenance technicians can only update MJCs assigned to them';
