-- Fix the notify_test_executed function to use correct enum values
CREATE OR REPLACE FUNCTION public.notify_test_executed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    test_title TEXT;
    executor_name TEXT;
    overall_result TEXT;
    passed_count INTEGER;
    failed_count INTEGER;
    total_steps INTEGER;
BEGIN
    -- Only notify on state change to done (was incorrectly using 'completed')
    IF OLD.state = 'done' AND NEW.state = 'done' THEN
        RETURN NEW;
    END IF;
    
    IF NEW.state != 'done' THEN
        RETURN NEW;
    END IF;

    -- Get test title and executor name
    SELECT title INTO test_title FROM tests WHERE id = NEW.test_id;
    SELECT display_name INTO executor_name FROM profiles WHERE id = NEW.assignee_id;
    executor_name := COALESCE(executor_name, 'Someone');

    -- Calculate results from step_results jsonb
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

    -- Notify project admins/managers about test execution
    INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
    SELECT DISTINCT pm.profile_id, NEW.org_id, NEW.project_id,
           'test_executed',
           'Test execution completed',
           executor_name || ' executed test "' || test_title || '" - Result: ' || overall_result || 
           ' (' || passed_count || '/' || total_steps || ' steps passed)',
           'test',
           NEW.test_id
    FROM project_members pm
    WHERE pm.project_id = NEW.project_id 
    AND pm.role_override IN ('admin', 'manager')
    AND pm.deleted_at IS NULL
    AND pm.profile_id != NEW.assignee_id;

    RETURN NEW;
END;
$function$