-- Enable pgTAP extension for database testing
-- pgTAP is a unit testing framework for PostgreSQL

-- Create extension
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA public;

-- Grant usage on pgtap functions to authenticated users (for running tests)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a helper function to run all tests
CREATE OR REPLACE FUNCTION run_all_tests()
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM runtests('public'::name);
END;
$$;

-- Comment
COMMENT ON EXTENSION pgtap IS 'Unit testing framework for PostgreSQL - used for BRCGS compliance validation';
COMMENT ON FUNCTION run_all_tests() IS 'Helper function to run all pgTAP tests in the public schema';
