-- Drop the existing "Org admins can manage members" policy
DROP POLICY IF EXISTS "Org admins can manage members" ON public.org_members;

-- Recreate it to allow both admins AND managers to manage members
CREATE POLICY "Org admins and managers can manage members"
ON public.org_members
FOR ALL
USING (
  (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) 
  AND deleted_at IS NULL
)
WITH CHECK (
  org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])
);

-- This allows admins and managers to:
-- - SELECT members where deleted_at IS NULL (USING clause)
-- - UPDATE members (including setting deleted_at) as long as they're admin or manager (WITH CHECK)
-- - DELETE members as long as they're admin or manager (WITH CHECK)
-- - INSERT members as long as they're admin or manager (WITH CHECK)