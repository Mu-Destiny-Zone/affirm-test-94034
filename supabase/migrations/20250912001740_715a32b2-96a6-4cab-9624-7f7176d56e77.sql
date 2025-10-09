-- Ensure UPDATE policy allows soft-deletes by not constraining deleted_at in WITH CHECK
BEGIN;
DROP POLICY IF EXISTS "Project admins/managers can update tests" ON public.tests;

CREATE POLICY "Project admins/managers can update tests" ON public.tests
FOR UPDATE
USING (
  project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])
)
WITH CHECK (
  project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])
);
COMMIT;