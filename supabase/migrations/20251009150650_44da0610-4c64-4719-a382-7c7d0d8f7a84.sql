-- Allow org owners to manage members (UPDATE/DELETE)
ALTER POLICY "Org admins/managers can update members"
ON public.org_members
USING ((((org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) OR EXISTS (
  SELECT 1 FROM public.orgs o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
)) AND (deleted_at IS NULL)))
WITH CHECK (true);

ALTER POLICY "Org admins/managers can delete members"
ON public.org_members
USING ((((org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) OR EXISTS (
  SELECT 1 FROM public.orgs o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
)) AND (deleted_at IS NULL)));
