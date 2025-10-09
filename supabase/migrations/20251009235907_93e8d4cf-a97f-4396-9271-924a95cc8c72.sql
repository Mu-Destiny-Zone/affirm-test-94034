-- One-time cleanup: Hard delete user momo752@qaplatform.local with all dependencies

-- Delete the project owned by this user
DELETE FROM public.projects WHERE id = '3582ebea-a0c2-4b6b-9c42-ebbea104b850';

-- Delete the soft-deleted organization
DELETE FROM public.orgs WHERE id = 'dccff9c1-b9f9-46c5-a8f2-c20dd2177f69';

-- Delete the profile
DELETE FROM public.profiles WHERE id = '3caf0f48-bace-4ad8-ac6a-d55a64286a6b';

-- Delete from auth.users (this will cascade to any remaining references)
DELETE FROM auth.users WHERE id = '3caf0f48-bace-4ad8-ac6a-d55a64286a6b';