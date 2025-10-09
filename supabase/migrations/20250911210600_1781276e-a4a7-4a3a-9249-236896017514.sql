-- Policy to allow owners to view their own orgs immediately after creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'orgs' AND policyname = 'Org owners can view own orgs'
  ) THEN
    CREATE POLICY "Org owners can view own orgs"
    ON public.orgs
    FOR SELECT
    TO authenticated
    USING ((owner_id = auth.uid()) AND (deleted_at IS NULL));
  END IF;
END $$;

-- Trigger to automatically add org owner as admin member after org creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_org_owner_membership'
  ) THEN
    CREATE TRIGGER trg_org_owner_membership
    AFTER INSERT ON public.orgs
    FOR EACH ROW
    EXECUTE FUNCTION public.add_org_owner_membership();
  END IF;
END $$;