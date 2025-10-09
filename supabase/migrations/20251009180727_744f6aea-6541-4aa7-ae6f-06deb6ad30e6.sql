-- Clean database keeping only mbm.marinov@gmail.com and asf org
-- User ID: 9db09127-d293-4da7-b464-18a3bcea805b
-- Org ID: 2e4930b6-02a9-4916-8ada-bf5cfc2695e4

-- Delete comments not from asf org
DELETE FROM comments WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete votes not from the user
DELETE FROM votes WHERE user_id != '9db09127-d293-4da7-b464-18a3bcea805b';

-- Delete notifications not for this user or org
DELETE FROM notifications WHERE user_id != '9db09127-d293-4da7-b464-18a3bcea805b' OR org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete activity log not from asf org
DELETE FROM activity_log WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete test assignments not from asf org
DELETE FROM test_assignments WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete suggestions not from asf org
DELETE FROM suggestions WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete bug reports not from asf org
DELETE FROM bug_reports WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete tests not from asf org
DELETE FROM tests WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete labels not from asf org
DELETE FROM labels WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete project members not from asf org projects
DELETE FROM project_members WHERE project_id NOT IN (SELECT id FROM projects WHERE org_id = '2e4930b6-02a9-4916-8ada-bf5cfc2695e4');

-- Delete projects not from asf org
DELETE FROM projects WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Delete org members not from asf org
DELETE FROM org_members WHERE org_id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4';

-- Soft delete orgs that are not asf
UPDATE orgs SET deleted_at = now() WHERE id != '2e4930b6-02a9-4916-8ada-bf5cfc2695e4' AND deleted_at IS NULL;

-- Soft delete profiles that are not mbm.marinov@gmail.com
UPDATE profiles SET deleted_at = now() WHERE id != '9db09127-d293-4da7-b464-18a3bcea805b' AND deleted_at IS NULL;