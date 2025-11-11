-- OHiSee Notification Queue/Logger Table
-- Tracks all notification attempts for monitoring and debugging
-- BRCGS Compliance: Audit trail for critical notifications

-- =============================================================================
-- TABLE: notifications
-- Purpose: Log all notification attempts and track delivery status
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Notification Details
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'machine_down_alert',
    'mjc_machine_down_alert',
    'hygiene_clearance_request',
    'temporary_repair_reminder',
    'end_of_day_summary'
  )),
  
  -- Recipient Information
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  
  -- Notification Content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'retrying'
  )),
  
  -- Delivery Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Related Entity (for traceability)
  entity_type TEXT, -- 'nca', 'mjc', 'work_order', 'end_of_day'
  entity_id UUID,
  
  -- Metadata
  metadata JSONB, -- Additional context (urgency, days_remaining, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- Index for retry queries
CREATE INDEX IF NOT EXISTS idx_notifications_retry ON notifications(status, retry_count) 
  WHERE status IN ('pending', 'failed', 'retrying') AND retry_count < max_retries;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Notification queue and logger - tracks all notification attempts';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification sent';
COMMENT ON COLUMN notifications.status IS 'Current status of notification delivery';
COMMENT ON COLUMN notifications.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN notifications.entity_type IS 'Type of related entity (nca, mjc, etc.)';
COMMENT ON COLUMN notifications.entity_id IS 'ID of related entity for traceability';

