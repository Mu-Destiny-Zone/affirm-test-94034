-- Allow org members to view other org members' profiles
CREATE POLICY "Org members can view other org member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.org_members om1
    JOIN public.org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.profile_id = auth.uid()
      AND om2.profile_id = profiles.id
      AND om1.deleted_at IS NULL
      AND om2.deleted_at IS NULL
  )
);