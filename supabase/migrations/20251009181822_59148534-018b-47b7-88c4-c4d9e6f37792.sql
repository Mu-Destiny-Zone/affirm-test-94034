-- Enable admins/managers to delete bugs
CREATE POLICY "Org admins/managers can delete bugs" 
ON public.bug_reports 
FOR DELETE 
USING (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

-- Enable admins/managers to delete suggestions
CREATE POLICY "Org admins/managers can delete suggestions" 
ON public.suggestions 
FOR DELETE 
USING (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

-- Create soft delete function for bugs
CREATE OR REPLACE FUNCTION public.soft_delete_bug(bug_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bug_org_id uuid;
BEGIN
  SELECT b.org_id INTO bug_org_id
  FROM public.bug_reports b
  WHERE b.id = soft_delete_bug.bug_id;

  IF bug_org_id IS NULL THEN
    RAISE EXCEPTION 'Bug not found';
  END IF;

  -- Allow only org admins/managers
  IF public.org_role(bug_org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    UPDATE public.bug_reports 
    SET deleted_at = now(), updated_at = now()
    WHERE id = soft_delete_bug.bug_id;
  ELSE
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;
END;
$function$;

-- Create soft delete function for suggestions
CREATE OR REPLACE FUNCTION public.soft_delete_suggestion(suggestion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  suggestion_org_id uuid;
BEGIN
  SELECT s.org_id INTO suggestion_org_id
  FROM public.suggestions s
  WHERE s.id = soft_delete_suggestion.suggestion_id;

  IF suggestion_org_id IS NULL THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;

  -- Allow only org admins/managers
  IF public.org_role(suggestion_org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    UPDATE public.suggestions 
    SET deleted_at = now(), updated_at = now()
    WHERE id = soft_delete_suggestion.suggestion_id;
  ELSE
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;
END;
$function$;