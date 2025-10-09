-- Allow any authenticated user to create an organization they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'orgs' AND policyname = 'Users can create own orgs'
  ) THEN
    CREATE POLICY "Users can create own orgs"
    ON public.orgs
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;