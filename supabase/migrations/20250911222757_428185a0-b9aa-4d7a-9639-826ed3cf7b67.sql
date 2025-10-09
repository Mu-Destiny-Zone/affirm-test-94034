-- Create trigger to send notification when a test assignment is updated (reassigned)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'notify_test_assigned_on_update'
  ) THEN
    CREATE TRIGGER notify_test_assigned_on_update
    AFTER UPDATE OF state, assignee_id, due_date ON public.test_assignments
    FOR EACH ROW
    WHEN (NEW.state = 'assigned' AND (OLD.state IS DISTINCT FROM NEW.state OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id OR OLD.due_date IS DISTINCT FROM NEW.due_date))
    EXECUTE FUNCTION public.notify_test_assigned();
  END IF;
END $$;