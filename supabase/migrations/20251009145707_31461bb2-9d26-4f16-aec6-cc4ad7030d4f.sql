-- Drop broad ALL policy to avoid conflicts
DROP POLICY IF EXISTS "Org admins and managers can manage members" ON public.org_members;

-- Ensure UPDATE is authorized based on OLD row only; do not re-check NEW row
ALTER POLICY "Org admins/managers can update members"
ON public.org_members
WITH CHECK (true);
