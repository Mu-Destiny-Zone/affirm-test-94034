-- Add dedicated INSERT policy for org admins and managers
-- This ensures managers can add members without relying on the ALL policy
CREATE POLICY "Org admins/managers can insert members"
ON public.org_members
FOR INSERT
WITH CHECK (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));