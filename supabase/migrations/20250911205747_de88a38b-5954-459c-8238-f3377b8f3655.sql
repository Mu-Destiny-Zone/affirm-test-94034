-- Create trigger function to auto-add org owner as admin member
CREATE OR REPLACE FUNCTION public.add_org_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the org owner is automatically added as an admin member
  INSERT INTO public.org_members (org_id, profile_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on orgs to call the function after insert
DROP TRIGGER IF EXISTS trg_org_owner_membership ON public.orgs;
CREATE TRIGGER trg_org_owner_membership
AFTER INSERT ON public.orgs
FOR EACH ROW
EXECUTE FUNCTION public.add_org_owner_membership();