-- Allow project admins/managers to insert test assignments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'test_assignments' AND policyname = 'Project admins/managers can insert assignments'
  ) THEN
    CREATE POLICY "Project admins/managers can insert assignments"
    ON public.test_assignments
    FOR INSERT
    WITH CHECK (public.project_role(project_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));
  END IF;
END $$;

-- Create trigger to send notification when a test is assigned
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'notify_test_assigned_on_insert'
  ) THEN
    CREATE TRIGGER notify_test_assigned_on_insert
    AFTER INSERT ON public.test_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_test_assigned();
  END IF;
END $$;