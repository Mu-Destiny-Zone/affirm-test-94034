-- Phase 1: Make project_id nullable in ALL tables that have it
ALTER TABLE public.comments ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.tests ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.test_assignments ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.labels ALTER COLUMN project_id DROP NOT NULL;

-- Phase 2: Set all existing project_ids to NULL
UPDATE public.tests SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.test_assignments SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.labels SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.bug_reports SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.suggestions SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.comments SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.notifications SET project_id = NULL WHERE project_id IS NOT NULL;
UPDATE public.activity_log SET project_id = NULL WHERE project_id IS NOT NULL;

-- Phase 3: Drop all project-based RLS policies and replace with org-based ones

-- Tests table
DROP POLICY IF EXISTS "Project admins/managers can delete tests" ON public.tests;
DROP POLICY IF EXISTS "Project admins/managers can insert tests" ON public.tests;
DROP POLICY IF EXISTS "Project admins/managers can update tests" ON public.tests;
DROP POLICY IF EXISTS "Project members can view tests" ON public.tests;

CREATE POLICY "Org admins/managers can delete tests" ON public.tests
FOR DELETE USING (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Org admins/managers can insert tests" ON public.tests
FOR INSERT WITH CHECK (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Org admins/managers can update tests" ON public.tests
FOR UPDATE USING (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Org members can view tests" ON public.tests
FOR SELECT USING (is_org_member(org_id) AND deleted_at IS NULL);

-- Test assignments table
DROP POLICY IF EXISTS "Assignees and managers can view assignments" ON public.test_assignments;
DROP POLICY IF EXISTS "Assignees can update own assignment state" ON public.test_assignments;
DROP POLICY IF EXISTS "Project admins/managers can insert assignments" ON public.test_assignments;
DROP POLICY IF EXISTS "Project admins/managers can manage assignments" ON public.test_assignments;

CREATE POLICY "Assignees and org managers can view assignments" ON public.test_assignments
FOR SELECT USING ((assignee_id = auth.uid() OR org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND deleted_at IS NULL);

CREATE POLICY "Assignees can update own assignment state" ON public.test_assignments
FOR UPDATE USING (assignee_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Org admins/managers can insert assignments" ON public.test_assignments
FOR INSERT WITH CHECK (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Org admins/managers can manage assignments" ON public.test_assignments
FOR ALL USING (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) AND deleted_at IS NULL);

-- Labels table
DROP POLICY IF EXISTS "Project admins/managers can manage labels" ON public.labels;
DROP POLICY IF EXISTS "Project members can view labels" ON public.labels;

CREATE POLICY "Org admins/managers can manage labels" ON public.labels
FOR ALL USING (org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) AND deleted_at IS NULL);

CREATE POLICY "Org members can view labels" ON public.labels
FOR SELECT USING (is_org_member(org_id) AND deleted_at IS NULL);

-- Bug reports table
DROP POLICY IF EXISTS "Authors and managers can update bugs" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view bugs" ON public.bug_reports;

CREATE POLICY "Authors and org managers can update bugs" ON public.bug_reports
FOR UPDATE USING ((reporter_id = auth.uid() OR org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND deleted_at IS NULL);

CREATE POLICY "Org members can view bugs" ON public.bug_reports
FOR SELECT USING (is_org_member(org_id) AND deleted_at IS NULL);

-- Suggestions table
DROP POLICY IF EXISTS "Authors and managers can update suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Users can view suggestions" ON public.suggestions;

CREATE POLICY "Authors and org managers can update suggestions" ON public.suggestions
FOR UPDATE USING ((author_id = auth.uid() OR org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND deleted_at IS NULL);

CREATE POLICY "Org members can view suggestions" ON public.suggestions
FOR SELECT USING (is_org_member(org_id) AND deleted_at IS NULL);

-- Comments table
DROP POLICY IF EXISTS "Authors and managers can update comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;

CREATE POLICY "Authors and org managers can update comments" ON public.comments
FOR UPDATE USING ((author_id = auth.uid() OR org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND deleted_at IS NULL);

CREATE POLICY "Org members can view comments" ON public.comments
FOR SELECT USING (is_org_member(org_id) AND deleted_at IS NULL);

-- Activity log table
DROP POLICY IF EXISTS "Project members can view activity" ON public.activity_log;

CREATE POLICY "Org members can view activity" ON public.activity_log
FOR SELECT USING (is_org_member(org_id));

-- Phase 4: Update notification triggers to be org-based
CREATE OR REPLACE FUNCTION public.notify_test_executed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    test_title TEXT;
    executor_name TEXT;
    overall_result TEXT;
    passed_count INTEGER;
    failed_count INTEGER;
    total_steps INTEGER;
BEGIN
    IF OLD.state = 'done' AND NEW.state = 'done' THEN
        RETURN NEW;
    END IF;
    
    IF NEW.state != 'done' THEN
        RETURN NEW;
    END IF;

    SELECT title INTO test_title FROM tests WHERE id = NEW.test_id;
    SELECT display_name INTO executor_name FROM profiles WHERE id = NEW.assignee_id;
    executor_name := COALESCE(executor_name, 'Someone');

    SELECT 
        COUNT(*) FILTER (WHERE (value->>'status') = 'pass'),
        COUNT(*) FILTER (WHERE (value->>'status') = 'fail'),
        COUNT(*)
    INTO passed_count, failed_count, total_steps
    FROM jsonb_array_elements(COALESCE(NEW.step_results, '[]'::jsonb));

    overall_result := CASE 
        WHEN failed_count > 0 THEN 'FAILED'
        WHEN passed_count = total_steps THEN 'PASSED'
        ELSE 'PARTIAL'
    END;

    -- Notify org admins/managers about test execution
    INSERT INTO notifications (user_id, org_id, type, title, message, entity_type, entity_id)
    SELECT DISTINCT om.profile_id, NEW.org_id,
           'test_executed',
           'Test execution completed',
           executor_name || ' executed test "' || test_title || '" - Result: ' || overall_result || 
           ' (' || passed_count || '/' || total_steps || ' steps passed)',
           'test',
           NEW.test_id
    FROM org_members om
    WHERE om.org_id = NEW.org_id 
    AND om.role IN ('admin', 'manager')
    AND om.deleted_at IS NULL
    AND om.profile_id != NEW.assignee_id;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_comment_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    target_title TEXT;
    target_owner_id UUID;
    commenter_name TEXT;
BEGIN
    IF NEW.target_type = 'bug' AND NEW.author_id = (SELECT reporter_id FROM bug_reports WHERE id = NEW.target_id) THEN
        RETURN NEW;
    END IF;
    IF NEW.target_type = 'suggestion' AND NEW.author_id = (SELECT author_id FROM suggestions WHERE id = NEW.target_id) THEN
        RETURN NEW;
    END IF;

    SELECT display_name INTO commenter_name FROM profiles WHERE id = NEW.author_id;
    commenter_name := COALESCE(commenter_name, 'Someone');

    IF NEW.target_type = 'bug' THEN
        SELECT title, reporter_id INTO target_title, target_owner_id 
        FROM bug_reports WHERE id = NEW.target_id;
        
        INSERT INTO notifications (user_id, org_id, type, title, message, entity_type, entity_id)
        VALUES (
            target_owner_id,
            NEW.org_id,
            'comment_added',
            'New comment on your bug report',
            commenter_name || ' commented on "' || target_title || '"',
            'bug',
            NEW.target_id
        );
        
    ELSIF NEW.target_type = 'suggestion' THEN
        SELECT title, author_id INTO target_title, target_owner_id 
        FROM suggestions WHERE id = NEW.target_id;
        
        INSERT INTO notifications (user_id, org_id, type, title, message, entity_type, entity_id)
        VALUES (
            target_owner_id,
            NEW.org_id,
            'comment_added',
            'New comment on your suggestion',
            commenter_name || ' commented on "' || target_title || '"',
            'suggestion',
            NEW.target_id
        );
        
    ELSIF NEW.target_type = 'test' THEN
        SELECT title INTO target_title FROM tests WHERE id = NEW.target_id;
        
        -- Notify org admins/managers about test comments
        INSERT INTO notifications (user_id, org_id, type, title, message, entity_type, entity_id)
        SELECT DISTINCT om.profile_id, NEW.org_id,
               'comment_added',
               'New comment on test case',
               commenter_name || ' commented on test "' || target_title || '"',
               'test',
               NEW.target_id
        FROM org_members om
        WHERE om.org_id = NEW.org_id 
        AND om.role IN ('admin', 'manager')
        AND om.deleted_at IS NULL
        AND om.profile_id != NEW.author_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Phase 5: Update soft_delete_test function to be org-based
CREATE OR REPLACE FUNCTION public.soft_delete_test(test_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  test_org_id uuid;
BEGIN
  SELECT t.org_id INTO test_org_id
  FROM public.tests t
  WHERE t.id = soft_delete_test.test_id;

  IF test_org_id IS NULL THEN
    RAISE EXCEPTION 'Test not found';
  END IF;

  -- Allow only org admins/managers
  IF public.org_role(test_org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]) THEN
    UPDATE public.tests 
    SET deleted_at = now(), updated_at = now()
    WHERE id = soft_delete_test.test_id;
  ELSE
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;
END;
$$;