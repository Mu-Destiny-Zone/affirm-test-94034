-- Fix extension schema placement by properly handling dependencies
-- First drop the dependent indexes
DROP INDEX IF EXISTS idx_tests_fulltext;
DROP INDEX IF EXISTS idx_bug_reports_fulltext; 
DROP INDEX IF EXISTS idx_suggestions_fulltext;

-- Now we can safely move the extension
DROP EXTENSION IF EXISTS pg_trgm CASCADE;

-- Create extensions schema and reinstall extension there
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Recreate the full-text search indexes using the proper schema
CREATE INDEX idx_tests_fulltext ON public.tests USING gin ((title || ' ' || COALESCE(description, '')) extensions.gin_trgm_ops);
CREATE INDEX idx_bug_reports_fulltext ON public.bug_reports USING gin ((title || ' ' || COALESCE(description, '')) extensions.gin_trgm_ops);  
CREATE INDEX idx_suggestions_fulltext ON public.suggestions USING gin ((title || ' ' || COALESCE(description, '')) extensions.gin_trgm_ops);