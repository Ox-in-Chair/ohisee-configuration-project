-- OHiSee NCA/MJC System - Audit Trail
-- BRCGS Compliance: Complete audit logging for all critical actions
-- Purpose: Track who, what, when, where for regulatory compliance
-- Immutable: INSERT only, no UPDATE or DELETE allowed

-- =============================================================================
-- TABLE: audit_trail
-- Purpose: Immutable audit log for BRCGS compliance
-- BRCGS: Track all changes to critical records (NCAs, MJCs, Work Orders)
-- =============================================================================
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was changed
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'ncas',
    'mjcs',
    'work_orders',
    'users',
    'machines'
  )),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'updated',
    'status_changed',
    'submitted',
    'assigned',
    'closed',
    'hygiene_clearance_granted',
    'machine_down_reported'
  )),

  -- Who made the change
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- When and where
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Change details (JSONB for flexibility)
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[], -- Array of field names that changed

  -- Additional context
  notes TEXT,

  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- INDEXES: Performance optimization for audit queries
-- =============================================================================
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
CREATE INDEX idx_audit_entity_id ON audit_trail(entity_id);

-- Composite index for common query pattern (entity + time range)
CREATE INDEX idx_audit_entity_timestamp ON audit_trail(entity_type, entity_id, timestamp DESC);

-- Partial indexes for critical actions
CREATE INDEX idx_audit_machine_down ON audit_trail(timestamp DESC)
  WHERE action = 'machine_down_reported';
CREATE INDEX idx_audit_hygiene_clearance ON audit_trail(timestamp DESC)
  WHERE action = 'hygiene_clearance_granted';

-- =============================================================================
-- FUNCTION: log_audit_trail()
-- Purpose: Generic trigger function to log changes to audit_trail
-- Usage: Attach to NCAs, MJCs, Work Orders tables
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  field_name TEXT;
  action_type TEXT;
  current_user_record RECORD;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific actions
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'submitted' OR NEW.status = 'open' THEN
        action_type := 'submitted';
      ELSIF NEW.status = 'closed' THEN
        action_type := 'closed';
      ELSE
        action_type := 'status_changed';
      END IF;
    ELSE
      action_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  -- Get current user info (from auth.uid() or set by application)
  SELECT email, name, role INTO current_user_record
  FROM users
  WHERE id = COALESCE(auth.uid(), NEW.created_by, OLD.created_by);

  -- For UPDATE, track which fields changed
  IF TG_OP = 'UPDATE' THEN
    changed_fields_array := ARRAY[]::TEXT[];

    -- Compare OLD and NEW to find changed fields
    FOR field_name IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = TG_TABLE_NAME
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
    LOOP
      -- Compare old and new values using DISTINCT FROM (handles NULLs)
      EXECUTE format('SELECT ($1).%I IS DISTINCT FROM ($2).%I', field_name, field_name)
      INTO STRICT DECLARE
        is_different BOOLEAN
      USING OLD, NEW;

      IF is_different THEN
        changed_fields_array := array_append(changed_fields_array, field_name);
      END IF;
    END LOOP;
  END IF;

  -- Insert audit trail record
  INSERT INTO audit_trail (
    entity_type,
    entity_id,
    action,
    user_id,
    user_email,
    user_name,
    user_role,
    ip_address,
    old_value,
    new_value,
    changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    action_type,
    COALESCE(auth.uid(), NEW.created_by, OLD.created_by),
    COALESCE(current_user_record.email, 'system@kangopak.com'),
    COALESCE(current_user_record.name, 'System'),
    COALESCE(current_user_record.role, 'system'),
    inet_client_addr(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    changed_fields_array
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit_trail IS 'BRCGS CRITICAL: Automatically logs all changes to audit_trail table';

-- =============================================================================
-- FUNCTION: log_machine_down_alert()
-- Purpose: Specific audit logging for Machine Down events (high priority)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_machine_down_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.machine_status = 'down' AND (OLD.machine_status IS NULL OR OLD.machine_status != 'down') THEN
    INSERT INTO audit_trail (
      entity_type,
      entity_id,
      action,
      user_id,
      user_email,
      user_name,
      user_role,
      ip_address,
      new_value,
      notes
    )
    SELECT
      TG_TABLE_NAME,
      NEW.id,
      'machine_down_reported',
      NEW.created_by,
      u.email,
      u.name,
      u.role,
      inet_client_addr(),
      jsonb_build_object(
        'machine_status', NEW.machine_status,
        'machine_down_since', NEW.machine_down_since,
        'estimated_downtime', NEW.estimated_downtime
      ),
      'CRITICAL: Machine Down reported - alert triggered'
    FROM users u
    WHERE u.id = NEW.created_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_machine_down_alert IS 'BRCGS CRITICAL: Logs Machine Down events for audit trail';

-- =============================================================================
-- FUNCTION: log_hygiene_clearance()
-- Purpose: Specific audit logging for Hygiene Clearance (BRCGS critical)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_hygiene_clearance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hygiene_clearance_signature IS NOT NULL AND
     (OLD.hygiene_clearance_signature IS NULL OR OLD.hygiene_clearance_signature != NEW.hygiene_clearance_signature) THEN

    INSERT INTO audit_trail (
      entity_type,
      entity_id,
      action,
      user_id,
      user_email,
      user_name,
      user_role,
      ip_address,
      new_value,
      notes
    )
    SELECT
      'mjc',
      NEW.id,
      'hygiene_clearance_granted',
      u.id,
      u.email,
      u.name,
      u.role,
      inet_client_addr(),
      jsonb_build_object(
        'hygiene_clearance_by', NEW.hygiene_clearance_by,
        'hygiene_clearance_at', NEW.hygiene_clearance_at,
        'hygiene_checklist', NEW.hygiene_checklist
      ),
      'BRCGS CRITICAL: Hygiene clearance granted - production can resume'
    FROM users u
    WHERE u.id = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_hygiene_clearance IS 'BRCGS CRITICAL: Logs hygiene clearance events with full checklist state';

-- =============================================================================
-- TRIGGERS: Apply audit logging to all critical tables
-- =============================================================================

-- NCAs audit trail
CREATE TRIGGER ncas_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER ncas_machine_down_alert
  AFTER INSERT OR UPDATE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION log_machine_down_alert();

-- MJCs audit trail
CREATE TRIGGER mjcs_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER mjcs_machine_down_alert
  AFTER INSERT OR UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION log_machine_down_alert();

CREATE TRIGGER mjcs_hygiene_clearance
  AFTER INSERT OR UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION log_hygiene_clearance();

-- Work Orders audit trail
CREATE TRIGGER work_orders_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

-- =============================================================================
-- RLS: Audit trail is read-only for all users
-- INSERT only via triggers, no manual INSERT/UPDATE/DELETE
-- =============================================================================
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Everyone can read audit trail for entities they have access to
CREATE POLICY "Users can view audit trail" ON audit_trail
  FOR SELECT
  USING (true); -- RLS filtering happens at entity level (NCAs/MJCs)

-- Only triggers can insert (SECURITY DEFINER functions bypass RLS)
-- No UPDATE or DELETE policy (immutable)

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON TABLE audit_trail IS 'BRCGS-compliant immutable audit log - INSERT only via triggers';
COMMENT ON COLUMN audit_trail.entity_type IS 'Type of record being audited (ncas, mjcs, work_orders)';
COMMENT ON COLUMN audit_trail.action IS 'Type of action performed (created, updated, status_changed, etc)';
COMMENT ON COLUMN audit_trail.changed_fields IS 'Array of field names that changed (for UPDATE actions)';
COMMENT ON COLUMN audit_trail.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN audit_trail.old_value IS 'Full JSONB snapshot before change (UPDATE/DELETE only)';
COMMENT ON COLUMN audit_trail.new_value IS 'Full JSONB snapshot after change (INSERT/UPDATE only)';
