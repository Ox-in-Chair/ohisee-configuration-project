-- OHiSee NCA/MJC System - Storage Buckets and RLS Policies
-- Purpose: BRCGS-compliant file attachment storage for NCA/MJC records
-- Architecture: Role-based access control with audit trail integration

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- NCA Attachments Bucket (Private)
-- Purpose: Store root cause analysis and corrective action attachments
-- Path structure: nca-attachments/{nca_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nca-attachments',
  'nca-attachments',
  false, -- Private bucket requiring RLS policies
  10485760, -- 10 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- MJC Attachments Bucket (Private)
-- Purpose: Store maintenance job card description attachments
-- Path structure: mjc-attachments/{mjc_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mjc-attachments',
  'mjc-attachments',
  false, -- Private bucket requiring RLS policies
  10485760, -- 10 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS POLICIES: NCA Attachments
-- =============================================================================

-- Policy 1: Allow authenticated users to upload files to their own NCA folders
CREATE POLICY "nca_upload_own_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'nca-attachments'
  AND auth.uid() IS NOT NULL
  -- Path format: nca-attachments/{nca_id}/{filename}
  -- User must be the creator of the NCA (checked via join)
  AND EXISTS (
    SELECT 1 FROM ncas
    WHERE ncas.id::text = (storage.foldername(name))[1]
    AND ncas.created_by = auth.uid()
  )
);

-- Policy 2: Allow users to view files from NCAs they created
CREATE POLICY "nca_view_own_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'nca-attachments'
  AND EXISTS (
    SELECT 1 FROM ncas
    WHERE ncas.id::text = (storage.foldername(name))[1]
    AND ncas.created_by = auth.uid()
  )
);

-- Policy 3: Allow QA Supervisors and Operations Managers to view all NCA files
CREATE POLICY "nca_view_all_supervisor"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'nca-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('qa-supervisor', 'operations-manager')
  )
);

-- Policy 4: Allow QA Supervisors to update/delete NCA files
CREATE POLICY "nca_manage_supervisor"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'nca-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('qa-supervisor', 'operations-manager')
  )
)
WITH CHECK (
  bucket_id = 'nca-attachments'
);

CREATE POLICY "nca_delete_supervisor"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'nca-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('qa-supervisor', 'operations-manager')
  )
);

-- =============================================================================
-- RLS POLICIES: MJC Attachments
-- =============================================================================

-- Policy 5: Allow authenticated users to upload files to their own MJC folders
CREATE POLICY "mjc_upload_own_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mjc-attachments'
  AND auth.uid() IS NOT NULL
  -- Path format: mjc-attachments/{mjc_id}/{filename}
  -- User must be the creator of the MJC (checked via join)
  AND EXISTS (
    SELECT 1 FROM mjcs
    WHERE mjcs.id::text = (storage.foldername(name))[1]
    AND mjcs.created_by = auth.uid()
  )
);

-- Policy 6: Allow users to view files from MJCs they created
CREATE POLICY "mjc_view_own_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mjc-attachments'
  AND EXISTS (
    SELECT 1 FROM mjcs
    WHERE mjcs.id::text = (storage.foldername(name))[1]
    AND mjcs.created_by = auth.uid()
  )
);

-- Policy 7: Allow Maintenance Technicians/Managers to view all MJC files
CREATE POLICY "mjc_view_all_maintenance"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mjc-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('maintenance-technician', 'maintenance-manager', 'operations-manager')
  )
);

-- Policy 8: Allow Maintenance Managers to update/delete MJC files
CREATE POLICY "mjc_manage_maintenance_manager"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mjc-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('maintenance-manager', 'operations-manager')
  )
)
WITH CHECK (
  bucket_id = 'mjc-attachments'
);

CREATE POLICY "mjc_delete_maintenance_manager"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mjc-attachments'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('maintenance-manager', 'operations-manager')
  )
);

-- =============================================================================
-- HELPER FUNCTIONS FOR FILE MANAGEMENT
-- =============================================================================

-- Function to get file count for a specific NCA
CREATE OR REPLACE FUNCTION get_nca_file_count(nca_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM storage.objects
    WHERE bucket_id = 'nca-attachments'
    AND (storage.foldername(name))[1] = nca_uuid::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get file count for a specific MJC
CREATE OR REPLACE FUNCTION get_mjc_file_count(mjc_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM storage.objects
    WHERE bucket_id = 'mjc-attachments'
    AND (storage.foldername(name))[1] = mjc_uuid::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all file paths for a specific NCA
CREATE OR REPLACE FUNCTION get_nca_file_paths(nca_uuid UUID)
RETURNS TABLE(file_path TEXT, file_size BIGINT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    name::TEXT,
    metadata->>'size' AS file_size,
    created_at
  FROM storage.objects
  WHERE bucket_id = 'nca-attachments'
  AND (storage.foldername(name))[1] = nca_uuid::text
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all file paths for a specific MJC
CREATE OR REPLACE FUNCTION get_mjc_file_paths(mjc_uuid UUID)
RETURNS TABLE(file_path TEXT, file_size BIGINT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    name::TEXT,
    metadata->>'size' AS file_size,
    created_at
  FROM storage.objects
  WHERE bucket_id = 'mjc-attachments'
  AND (storage.foldername(name))[1] = mjc_uuid::text
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================

COMMENT ON FUNCTION get_nca_file_count IS 'Returns the number of files attached to a specific NCA';
COMMENT ON FUNCTION get_mjc_file_count IS 'Returns the number of files attached to a specific MJC';
COMMENT ON FUNCTION get_nca_file_paths IS 'Returns file paths, sizes, and timestamps for NCA attachments';
COMMENT ON FUNCTION get_mjc_file_paths IS 'Returns file paths, sizes, and timestamps for MJC attachments';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify buckets created
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('nca-attachments', 'mjc-attachments');

-- Verify RLS policies created
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' ORDER BY policyname;

-- Test file count functions (should return 0 for new system)
-- SELECT get_nca_file_count('40000000-0000-0000-0000-000000000001');
-- SELECT get_mjc_file_count('50000000-0000-0000-0000-000000000001');
