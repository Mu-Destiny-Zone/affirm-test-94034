-- Allow org admins to view profiles that are not members of any org (to manage unassigned users)
CREATE POLICY "Admins can view unassigned profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.profile_id = auth.uid()
      AND om.role = 'admin'
      AND om.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.org_members om2
    WHERE om2.profile_id = profiles.id
      AND om2.deleted_at IS NULL
  )
);
