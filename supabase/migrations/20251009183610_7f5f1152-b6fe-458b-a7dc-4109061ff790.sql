-- Add policy to allow org members to view profiles referenced in their org content
CREATE POLICY "Org members can view profiles referenced in their org content"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.suggestions s
    WHERE s.author_id = profiles.id
      AND public.is_org_member(s.org_id)
      AND s.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.bug_reports b
    WHERE b.reporter_id = profiles.id
      AND public.is_org_member(b.org_id)
      AND b.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.comments c
    WHERE c.author_id = profiles.id
      AND public.is_org_member(c.org_id)
      AND c.deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.test_assignments ta
    WHERE ta.assignee_id = profiles.id
      AND public.is_org_member(ta.org_id)
      AND ta.deleted_at IS NULL
  )
);