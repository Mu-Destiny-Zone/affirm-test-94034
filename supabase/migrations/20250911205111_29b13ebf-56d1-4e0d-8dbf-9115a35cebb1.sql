UPDATE public.org_members 
SET role = 'admin'
WHERE profile_id = (
  SELECT id FROM public.profiles WHERE email = 'momo752@qaplatform.local'
)
AND deleted_at IS NULL;