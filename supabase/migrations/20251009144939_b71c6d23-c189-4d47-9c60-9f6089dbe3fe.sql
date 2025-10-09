-- Add SELECT policy for org owners to view members
CREATE POLICY "Org owners can view members"
ON public.org_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orgs o
    WHERE o.id = org_members.org_id
      AND o.owner_id = auth.uid()
      AND o.deleted_at IS NULL
  )
  AND org_members.deleted_at IS NULL
);

-- Backfill: ensure all org owners are also org admins
INSERT INTO public.org_members (org_id, profile_id, role)
SELECT o.id, o.owner_id, 'admin'::app_role
FROM public.orgs o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.org_id = o.id
      AND om.profile_id = o.owner_id
      AND om.deleted_at IS NULL
  )
ON CONFLICT DO NOTHING;