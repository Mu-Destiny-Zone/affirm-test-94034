-- Drop the existing "Org admins can manage members" policy
DROP POLICY IF EXISTS "Org admins can manage members" ON public.org_members;

-- Recreate it with proper WITH CHECK clause that allows soft deletes
CREATE POLICY "Org admins can manage members"
ON public.org_members
FOR ALL
USING (
  is_org_admin(org_id) AND deleted_at IS NULL
)
WITH CHECK (
  is_org_admin(org_id)
);

-- This allows admins to:
-- - SELECT members where deleted_at IS NULL (USING clause)
-- - UPDATE members (including setting deleted_at) as long as they're admin (WITH CHECK)
-- - DELETE members as long as they're admin (WITH CHECK)
-- - INSERT members as long as they're admin (WITH CHECK)