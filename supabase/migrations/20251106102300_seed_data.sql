-- OHiSee NCA/MJC System - Seed Data
-- Purpose: Test data for development and testing
-- 6 users (one per role), 3 machines, 2 work orders
-- DO NOT RUN IN PRODUCTION - Development/Testing only

-- =============================================================================
-- SEED: Users (6 roles)
-- =============================================================================
INSERT INTO users (id, email, name, role, department, active) VALUES
  -- Operator
  (
    '10000000-0000-0000-0000-000000000001',
    'john.smith@kangopak.com',
    'John Smith',
    'operator',
    'pouching',
    true
  ),
  -- Team Leader
  (
    '10000000-0000-0000-0000-000000000002',
    'jane.doe@kangopak.com',
    'Jane Doe',
    'team-leader',
    'pouching',
    true
  ),
  -- Maintenance Technician
  (
    '10000000-0000-0000-0000-000000000003',
    'mike.johnson@kangopak.com',
    'Mike Johnson',
    'maintenance-technician',
    'maintenance',
    true
  ),
  -- QA Supervisor
  (
    '10000000-0000-0000-0000-000000000004',
    'sarah.williams@kangopak.com',
    'Sarah Williams',
    'qa-supervisor',
    'pouching',
    true
  ),
  -- Maintenance Manager
  (
    '10000000-0000-0000-0000-000000000005',
    'robert.brown@kangopak.com',
    'Robert Brown',
    'maintenance-manager',
    'maintenance',
    true
  ),
  -- Operations Manager
  (
    '10000000-0000-0000-0000-000000000006',
    'david.wilson@kangopak.com',
    'David Wilson',
    'operations-manager',
    'pouching',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Machines (3 production machines)
-- =============================================================================
INSERT INTO machines (id, machine_code, machine_name, department, status, location) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'CMH-01',
    'Pouching Machine Line 1',
    'pouching',
    'operational',
    'Production Floor A'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'CMH-02',
    'Pouching Machine Line 2',
    'pouching',
    'down',
    'Production Floor A'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'SLT-01',
    'Slitter Rewinder',
    'slitting',
    'operational',
    'Production Floor B'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Work Orders (2 active work orders)
-- =============================================================================
INSERT INTO work_orders (
  id,
  wo_number,
  machine_id,
  operator_id,
  start_timestamp,
  end_timestamp,
  status,
  department,
  product_description,
  batch_number
) VALUES
  -- Active work order (Line 1)
  (
    '30000000-0000-0000-0000-000000000001',
    'WO-20251106-CMH-001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '3 hours',
    NULL,
    'active',
    'pouching',
    'Stand-up Pouches 250ml - Client: ABC Foods',
    'BATCH-2025-1106-001'
  ),
  -- Paused work order (Line 2 - Machine Down)
  (
    '30000000-0000-0000-0000-000000000002',
    'WO-20251105-CMH-015',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '1 day',
    NULL,
    'paused',
    'pouching',
    'Spout Pouches 500ml - Client: XYZ Beverages',
    'BATCH-2025-1105-015'
  ),
  -- Completed work order (yesterday)
  (
    '30000000-0000-0000-0000-000000000003',
    'WO-20251105-SLT-007',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 hour',
    'completed',
    'slitting',
    'Film Slitting - 500mm width rolls',
    'BATCH-2025-1105-007'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Sample NCA (Draft)
-- Purpose: Show draft NCA for testing
-- =============================================================================
INSERT INTO ncas (
  id,
  nca_number,
  wo_id,
  raised_by_user_id,
  created_by,
  date,
  time,
  nc_type,
  nc_product_description,
  sample_available,
  nc_description,
  machine_status,
  hold_label_completed,
  nca_logged,
  status
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  'NCA-2025-00000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  NOW(),
  TO_CHAR(NOW(), 'HH24:MI'),
  'wip',
  'Stand-up Pouches 250ml - Misaligned print registration detected during quality inspection on Line 1',
  true,
  'During routine quality inspection at 10:15 AM, print registration on pouches was found to be misaligned by approximately 3mm. This affects product appearance and may impact customer perception. Approximately 50 units affected before issue detected. Root cause investigation required to determine if this is material issue or machine calibration problem.',
  'operational',
  true,
  true,
  'draft'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Sample MJC (Draft with Machine Down)
-- Purpose: Show critical MJC for testing
-- =============================================================================
INSERT INTO mjcs (
  id,
  job_card_number,
  wo_id,
  raised_by_user_id,
  created_by,
  date,
  time,
  department,
  machine_equipment,
  machine_id,
  maintenance_category,
  maintenance_type_mechanical,
  machine_status,
  urgency,
  machine_down_since,
  estimated_downtime,
  temporary_repair,
  description_required,
  status
) VALUES (
  '50000000-0000-0000-0000-000000000001',
  'MJC-2025-00000001',
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '2 hours',
  TO_CHAR(NOW() - INTERVAL '2 hours', 'HH24:MI'),
  'pouching',
  'CMH-02 Pouching Machine Line 2',
  '20000000-0000-0000-0000-000000000002',
  'reactive',
  true,
  'down',
  'critical',
  NOW() - INTERVAL '2 hours',
  240, -- 4 hours estimated
  false,
  'Machine making unusual grinding noise from main drive motor. Production stopped immediately. Visual inspection shows no obvious damage but motor running hot. Requires urgent investigation and repair.',
  'open'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Sample Hygiene Checklist (for MJC testing)
-- Purpose: Pre-populate hygiene checklist structure
-- =============================================================================
UPDATE mjcs
SET hygiene_checklist = '[
  {"item": "Machine cleaned and sanitized", "verified": false, "notes": ""},
  {"item": "Foreign material check completed", "verified": false, "notes": ""},
  {"item": "Machine guards replaced and secure", "verified": false, "notes": ""},
  {"item": "No tools or materials left on machine", "verified": false, "notes": ""},
  {"item": "Lubricants food-grade and approved", "verified": false, "notes": ""},
  {"item": "Floor area cleaned and dry", "verified": false, "notes": ""},
  {"item": "Waste bins emptied and sanitized", "verified": false, "notes": ""},
  {"item": "Machine ready for production", "verified": false, "notes": ""},
  {"item": "Safety signage and labels intact", "verified": false, "notes": ""},
  {"item": "Test run completed successfully", "verified": false, "notes": ""}
]'::jsonb
WHERE id = '50000000-0000-0000-0000-000000000001';

-- =============================================================================
-- VERIFICATION QUERIES
-- Purpose: Validate seed data loaded correctly
-- =============================================================================

-- Verify users loaded
-- SELECT COUNT(*) as user_count FROM users; -- Should return 6

-- Verify machines loaded
-- SELECT COUNT(*) as machine_count FROM machines; -- Should return 3

-- Verify work orders loaded
-- SELECT COUNT(*) as wo_count FROM work_orders; -- Should return 3

-- Verify NCA loaded
-- SELECT nca_number, status, nc_type FROM ncas; -- Should return 1 draft NCA

-- Verify MJC loaded
-- SELECT job_card_number, status, urgency, machine_status FROM mjcs; -- Should return 1 open MJC

-- Verify hygiene checklist structure
-- SELECT
--   job_card_number,
--   jsonb_array_length(hygiene_checklist) as checklist_items,
--   (SELECT COUNT(*) FROM jsonb_array_elements(hygiene_checklist) WHERE (value->>'verified')::boolean = true) as verified_count
-- FROM mjcs
-- WHERE id = '50000000-0000-0000-0000-000000000001';
-- Should show 10 items, 0 verified

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON TABLE users IS 'Seed data includes 6 users covering all system roles';
COMMENT ON TABLE machines IS 'Seed data includes 3 machines: 2 pouching lines + 1 slitter';
COMMENT ON TABLE work_orders IS 'Seed data includes 3 work orders: 1 active, 1 paused, 1 completed';

-- =============================================================================
-- RESET SEQUENCES (if needed during development)
-- =============================================================================
-- Ensure NCA/MJC sequences start after seed data
SELECT setval('nca_number_seq', 1, false);
SELECT setval('mjc_number_seq', 1, false);
