-- Fix suggestions table RLS policy to prevent public access
-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can view suggestions" ON public.suggestions;

-- Create new secure policy requiring authentication and proper membership
CREATE POLICY "Users can view suggestions" ON public.suggestions
FOR SELECT USING (
  (deleted_at IS NULL) AND (
    -- For project-level suggestions: user must be a project member
    (project_id IS NOT NULL AND is_project_member(project_id)) OR
    -- For org-level suggestions: user must be an org member
    (project_id IS NULL AND is_org_member(org_id))
  )
);

-- Fix bug_reports table RLS policy to prevent public access
-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can view bugs" ON public.bug_reports;

-- Create new secure policy requiring authentication and proper membership
CREATE POLICY "Users can view bugs" ON public.bug_reports
FOR SELECT USING (
  (deleted_at IS NULL) AND (
    -- For project-level bugs: user must be a project member
    (project_id IS NOT NULL AND is_project_member(project_id)) OR
    -- For org-level bugs: user must be an org member
    (project_id IS NULL AND is_org_member(org_id))
  )
);