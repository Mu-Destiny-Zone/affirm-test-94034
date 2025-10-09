
-- Prevent removing org owners from their orgs
CREATE OR REPLACE FUNCTION public.soft_remove_org_member(p_org_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Get org owner
  SELECT owner_id INTO v_owner_id FROM public.orgs WHERE id = p_org_id AND deleted_at IS NULL;
  
  -- Prevent removing the org owner
  IF v_owner_id = p_profile_id THEN
    RAISE EXCEPTION 'Cannot remove org owner from their organization';
  END IF;

  -- Authorize caller: must be admin/manager in the org OR org owner
  IF public.org_role(p_org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) 
     OR v_owner_id = auth.uid()
  THEN
    UPDATE public.org_members
    SET deleted_at = now(), updated_at = now()
    WHERE org_id = p_org_id
      AND profile_id = p_profile_id
      AND deleted_at IS NULL;
  ELSE
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;
END;
$$;

-- Restore owner membership for "asf" org
UPDATE public.org_members
SET deleted_at = NULL, updated_at = now(), role = 'admin'
WHERE org_id = '2e4930b6-02a9-4916-8ada-bf5cfc2695e4'
  AND profile_id = '3caf0f48-bace-4ad8-ac6a-d55a64286a6b';
