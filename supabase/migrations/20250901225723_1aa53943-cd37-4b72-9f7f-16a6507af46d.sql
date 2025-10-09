-- Move extensions from public to extensions schema for better security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Update search indexes to use the extension from the proper schema
DROP INDEX IF EXISTS idx_tests_fulltext;
DROP INDEX IF EXISTS idx_bug_reports_fulltext;
DROP INDEX IF EXISTS idx_suggestions_fulltext;

-- Recreate indexes with proper extension reference
CREATE INDEX idx_tests_fulltext ON public.tests USING gin ((title || ' ' || COALESCE(description, '')) extensions.gin_trgm_ops);
CREATE INDEX idx_bug_reports_fulltext ON public.bug_reports USING gin ((title || ' ' || COALESCE(description, '')) extensions.gin_trgm_ops);
CREATE INDEX idx_suggestions_fulltext ON public.suggestions USING gin ((title || ' ' || COALESCE(description, '')) extensions.gin_trgm_ops);