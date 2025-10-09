-- Switch roles for mbm.marinov@gmail.com and momo752@qaplatform.local
-- In both organizations

-- Update mbm.marinov@gmail.com from tester to admin in both orgs
UPDATE org_members
SET role = 'admin', updated_at = now()
WHERE profile_id = '9db09127-d293-4da7-b464-18a3bcea805b'
AND deleted_at IS NULL;

-- Update momo752@qaplatform.local from admin to tester in both orgs
UPDATE org_members
SET role = 'tester', updated_at = now()
WHERE profile_id = '3caf0f48-bace-4ad8-ac6a-d55a64286a6b'
AND deleted_at IS NULL;