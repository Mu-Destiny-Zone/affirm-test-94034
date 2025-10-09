-- Re-create org_members RLS without RESTRICTIVE to avoid syntax issues
DROP POLICY IF EXISTS "Org members self or admins/managers can view" ON public.org_members;
DROP POLICY IF EXISTS "Org admins/managers can update members" ON public.org_members;
DROP POLICY IF EXISTS "Org admins/managers can delete members" ON public.org_members;
DROP POLICY IF EXISTS "Admins/managers/owners can insert members" ON public.org_members;

-- SELECT: allow self or org admins/managers; hide soft-deleted
CREATE POLICY "Org members self or admins/managers can view"
ON public.org_members
FOR SELECT
USING (((profile_id = auth.uid()) OR (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]))) AND (deleted_at IS NULL));

-- UPDATE: only admins/managers on non-deleted rows
CREATE POLICY "Org admins/managers can update members"
ON public.org_members
FOR UPDATE
USING ((org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND (deleted_at IS NULL))
WITH CHECK (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

-- DELETE: only admins/managers on non-deleted rows
CREATE POLICY "Org admins/managers can delete members"
ON public.org_members
FOR DELETE
USING ((org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND (deleted_at IS NULL));

-- INSERT: admins/managers OR org owner
CREATE POLICY "Admins/managers/owners can insert members"
ON public.org_members
FOR INSERT
WITH CHECK (
  (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]))
  OR EXISTS (
    SELECT 1 FROM public.orgs o 
    WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
  )
);
