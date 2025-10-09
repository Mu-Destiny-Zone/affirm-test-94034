-- Allow org owners to insert initial members (including themselves)
CREATE POLICY IF NOT EXISTS "Org owners can insert org members"
ON public.org_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orgs o
    WHERE o.id = org_members.org_id
    AND o.owner_id = auth.uid()
  )
);
