
-- Allow org admins to transfer ownership too
CREATE OR REPLACE FUNCTION public.transfer_org_ownership(p_org_id uuid, p_new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_owner_id uuid;
  v_caller_role app_role;
BEGIN
  -- Get current owner and caller's role
  SELECT owner_id INTO v_current_owner_id 
  FROM public.orgs 
  WHERE id = p_org_id AND deleted_at IS NULL;
  
  IF v_current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Get caller's role
  v_caller_role := public.org_role(p_org_id);
  
  -- Only owner or admin can transfer ownership
  IF v_current_owner_id != auth.uid() AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only the owner or an admin can transfer ownership';
  END IF;
  
  -- Cannot transfer to self
  IF v_current_owner_id = p_new_owner_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to the current owner';
  END IF;
  
  -- Ensure new owner is a member, if not add them as admin
  INSERT INTO public.org_members (org_id, profile_id, role)
  VALUES (p_org_id, p_new_owner_id, 'admin')
  ON CONFLICT (org_id, profile_id) 
  DO UPDATE SET 
    role = 'admin',
    deleted_at = NULL,
    updated_at = now();
  
  -- Update org owner
  UPDATE public.orgs
  SET owner_id = p_new_owner_id, updated_at = now()
  WHERE id = p_org_id;
  
  -- Make previous owner an admin member
  UPDATE public.org_members
  SET role = 'admin', updated_at = now()
  WHERE org_id = p_org_id 
    AND profile_id = v_current_owner_id 
    AND deleted_at IS NULL;
END;
$$;
