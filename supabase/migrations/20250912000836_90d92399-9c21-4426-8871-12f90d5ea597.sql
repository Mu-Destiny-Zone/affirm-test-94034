-- Relax UPDATE policy to avoid WITH CHECK issues on soft-delete
DROP POLICY IF EXISTS "Project admins/managers can update tests" ON public.tests;

CREATE POLICY "Project admins/managers can update tests" ON public.tests
FOR UPDATE 
USING (project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));