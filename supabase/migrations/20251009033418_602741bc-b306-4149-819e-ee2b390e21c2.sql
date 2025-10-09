-- Also allow org owners to view profiles that are not members of any org
CREATE POLICY "Org owners can view unassigned profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orgs o
    WHERE o.owner_id = auth.uid()
      AND o.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.org_members om2
    WHERE om2.profile_id = profiles.id
      AND om2.deleted_at IS NULL
  )
);
