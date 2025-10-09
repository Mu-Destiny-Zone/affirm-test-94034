-- Drop the existing policy that's causing issues
DROP POLICY IF EXISTS "Project admins/managers can manage tests" ON public.tests;

-- Create separate policies for different operations to handle soft deletes properly
CREATE POLICY "Project admins/managers can update tests" ON public.tests
FOR UPDATE 
USING (project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Project admins/managers can delete tests" ON public.tests
FOR DELETE 
USING (project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));