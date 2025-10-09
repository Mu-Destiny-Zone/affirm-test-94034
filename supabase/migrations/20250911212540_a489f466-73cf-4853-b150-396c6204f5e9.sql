-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_comment_added ON comments;
DROP TRIGGER IF EXISTS trigger_notify_vote_received ON votes;
DROP TRIGGER IF EXISTS trigger_notify_test_assigned ON test_assignments;
DROP TRIGGER IF EXISTS trigger_notify_test_executed ON test_assignments;

-- Create notification trigger functions
CREATE OR REPLACE FUNCTION public.notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
    target_title TEXT;
    target_owner_id UUID;
    commenter_name TEXT;
BEGIN
    -- Skip if commenting on own content
    IF NEW.target_type = 'bug' AND NEW.author_id = (SELECT reporter_id FROM bug_reports WHERE id = NEW.target_id) THEN
        RETURN NEW;
    END IF;
    IF NEW.target_type = 'suggestion' AND NEW.author_id = (SELECT author_id FROM suggestions WHERE id = NEW.target_id) THEN
        RETURN NEW;
    END IF;

    -- Get commenter name
    SELECT display_name INTO commenter_name FROM profiles WHERE id = NEW.author_id;
    commenter_name := COALESCE(commenter_name, 'Someone');

    -- Get target details and owner
    IF NEW.target_type = 'bug' THEN
        SELECT title, reporter_id INTO target_title, target_owner_id 
        FROM bug_reports WHERE id = NEW.target_id;
        
        -- Notify bug reporter
        INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
        VALUES (
            target_owner_id,
            NEW.org_id,
            NEW.project_id,
            'comment_added',
            'New comment on your bug report',
            commenter_name || ' commented on "' || target_title || '"',
            'bug',
            NEW.target_id
        );
        
    ELSIF NEW.target_type = 'suggestion' THEN
        SELECT title, author_id INTO target_title, target_owner_id 
        FROM suggestions WHERE id = NEW.target_id;
        
        -- Notify suggestion author
        INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
        VALUES (
            target_owner_id,
            NEW.org_id,
            NEW.project_id,
            'comment_added',
            'New comment on your suggestion',
            commenter_name || ' commented on "' || target_title || '"',
            'suggestion',
            NEW.target_id
        );
        
    ELSIF NEW.target_type = 'test' THEN
        SELECT title INTO target_title FROM tests WHERE id = NEW.target_id;
        
        -- Notify all project admins/managers about test comments
        INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
        SELECT DISTINCT pm.profile_id, NEW.org_id, NEW.project_id,
               'comment_added',
               'New comment on test case',
               commenter_name || ' commented on test "' || target_title || '"',
               'test',
               NEW.target_id
        FROM project_members pm
        WHERE pm.project_id = NEW.project_id 
        AND pm.role_override IN ('admin', 'manager')
        AND pm.deleted_at IS NULL
        AND pm.profile_id != NEW.author_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create vote notification trigger function
CREATE OR REPLACE FUNCTION public.notify_vote_received()
RETURNS TRIGGER AS $$
DECLARE
    target_title TEXT;
    target_owner_id UUID;
    voter_name TEXT;
    vote_text TEXT;
BEGIN
    -- Skip self-votes
    IF NEW.target_type = 'bug' AND NEW.user_id = (SELECT reporter_id FROM bug_reports WHERE id = NEW.target_id) THEN
        RETURN NEW;
    END IF;
    IF NEW.target_type = 'suggestion' AND NEW.user_id = (SELECT author_id FROM suggestions WHERE id = NEW.target_id) THEN
        RETURN NEW;
    END IF;

    -- Get voter name
    SELECT display_name INTO voter_name FROM profiles WHERE id = NEW.user_id;
    voter_name := COALESCE(voter_name, 'Someone');
    vote_text := CASE WHEN NEW.vote_type THEN 'upvoted' ELSE 'downvoted' END;

    -- Get target details and notify owner
    IF NEW.target_type = 'bug' THEN
        SELECT title, reporter_id INTO target_title, target_owner_id 
        FROM bug_reports WHERE id = NEW.target_id;
        
        INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
        SELECT target_owner_id, br.org_id, br.project_id,
               'vote_received',
               'Vote on your bug report',
               voter_name || ' ' || vote_text || ' "' || target_title || '"',
               'bug',
               NEW.target_id
        FROM bug_reports br WHERE br.id = NEW.target_id;
        
    ELSIF NEW.target_type = 'suggestion' THEN
        SELECT title, author_id INTO target_title, target_owner_id 
        FROM suggestions WHERE id = NEW.target_id;
        
        INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
        SELECT target_owner_id, s.org_id, s.project_id,
               'vote_received', 
               'Vote on your suggestion',
               voter_name || ' ' || vote_text || ' "' || target_title || '"',
               'suggestion',
               NEW.target_id
        FROM suggestions s WHERE s.id = NEW.target_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create test assignment notification trigger function
CREATE OR REPLACE FUNCTION public.notify_test_assigned()
RETURNS TRIGGER AS $$
DECLARE
    test_title TEXT;
    assigner_name TEXT;
BEGIN
    -- Skip if self-assigning
    IF NEW.assignee_id = auth.uid() THEN
        RETURN NEW;
    END IF;

    -- Get test title and assigner name
    SELECT title INTO test_title FROM tests WHERE id = NEW.test_id;
    SELECT display_name INTO assigner_name FROM profiles WHERE id = auth.uid();
    assigner_name := COALESCE(assigner_name, 'Someone');

    -- Notify assignee
    INSERT INTO notifications (user_id, org_id, project_id, type, title, message, entity_type, entity_id)
    VALUES (
        NEW.assignee_id,
        NEW.org_id,
        NEW.project_id,
        'test_assigned',
        'Test assigned to you',
        assigner_name || ' assigned you test "' || test_title || '"' || 
        CASE WHEN NEW.due_date IS NOT NULL THEN ' (due ' || NEW.due_date || ')' ELSE '' END,
        'test',
        NEW.test_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create test execution notification trigger function  
CREATE OR REPLACE FUNCTION public.notify_test_executed()
RETURNS TRIGGER AS $$
DECLARE
    test_title TEXT;
    executor_name TEXT;
    overall_result TEXT;
    passed_count INTEGER;
    failed_count INTEGER;
    total_steps INTEGER;
BEGIN
    -- Only notify on state change to completed
    IF OLD.state = 'completed' AND NEW.state = 'completed' THEN
        RETURN NEW;
    END IF;
    
    IF NEW.state != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Get test title and executor name
    SELECT title INTO test_title FROM tests WHERE id = NEW.test_id;
    SELECT display_name INTO executor_name FROM profiles WHERE id = NEW.assignee_id;
    executor_name := COALESCE(executor_name, 'Someone');

    -- Calculate results from step_results jsonb
    SELECT 
        COUNT(*) FILTER (WHERE (value->>'result') = 'pass'),
        COUNT(*) FILTER (WHERE (value->>'result') = 'fail'),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER trigger_notify_comment_added
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_comment_added();

CREATE TRIGGER trigger_notify_vote_received
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION notify_vote_received();

CREATE TRIGGER trigger_notify_test_assigned
    AFTER INSERT ON test_assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_test_assigned();

CREATE TRIGGER trigger_notify_test_executed
    AFTER UPDATE ON test_assignments
    FOR EACH ROW
    EXECUTE FUNCTION notify_test_executed();