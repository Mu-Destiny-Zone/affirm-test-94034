-- Create RPC to perform soft delete with SECURITY DEFINER to bypass RLS while enforcing role check
BEGIN;
CREATE OR REPLACE FUNCTION public.soft_delete_test(test_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  proj_id uuid;
BEGIN
  -- Find the project for the test
  SELECT t.project_id INTO proj_id
  FROM public.tests t
  WHERE t.id = soft_delete_test.test_id;

  IF proj_id IS NULL THEN
    RAISE EXCEPTION 'Test not found';
  END IF;

  -- Allow only project admins/managers
  IF public.project_role(proj_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    UPDATE public.tests 
    SET deleted_at = now(), updated_at = now()
    WHERE id = soft_delete_test.test_id;
  ELSE
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_test(uuid) TO authenticated;
COMMIT;