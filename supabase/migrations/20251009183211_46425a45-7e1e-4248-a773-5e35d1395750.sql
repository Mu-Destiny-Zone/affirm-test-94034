-- Fix RLS policies on profiles table
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view unassigned profiles" ON public.profiles;
DROP POLICY IF EXISTS "Org admins can view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Org members can view other org member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Org owners can view unassigned profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new permissive policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Org members can view other org member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM org_members om1
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.profile_id = auth.uid()
      AND om2.profile_id = profiles.id
      AND om1.deleted_at IS NULL
      AND om2.deleted_at IS NULL
  )
);

-- Add foreign key constraints only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bug_reports_reporter_id_fkey'
  ) THEN
    ALTER TABLE public.bug_reports
    ADD CONSTRAINT bug_reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suggestions_author_id_fkey'
  ) THEN
    ALTER TABLE public.suggestions
    ADD CONSTRAINT suggestions_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_author_id_fkey'
  ) THEN
    ALTER TABLE public.comments
    ADD CONSTRAINT comments_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'test_assignments_assignee_id_fkey'
  ) THEN
    ALTER TABLE public.test_assignments
    ADD CONSTRAINT test_assignments_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES public.profiles(id)
    ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_members_profile_id_fkey'
  ) THEN
    ALTER TABLE public.org_members
    ADD CONSTRAINT org_members_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;