-- Fix notify_test_assigned to prevent duplicate notifications
CREATE OR REPLACE FUNCTION public.notify_test_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    test_title TEXT;
    assigner_name TEXT;
    existing_notification_count INTEGER;
BEGIN
    -- Skip if self-assigning
    IF NEW.assignee_id = auth.uid() THEN
        RETURN NEW;
    END IF;

    -- Check if notification already exists for this assignment
    SELECT COUNT(*) INTO existing_notification_count
    FROM notifications
    WHERE user_id = NEW.assignee_id
      AND type = 'test_assigned'
      AND entity_type = 'test'
      AND entity_id = NEW.test_id
      AND created_at > NOW() - INTERVAL '5 seconds';
    
    -- Skip if notification was recently created (prevents duplicates)
    IF existing_notification_count > 0 THEN
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
$function$;