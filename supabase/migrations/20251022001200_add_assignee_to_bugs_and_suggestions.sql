-- Add assignee_id column to bug_reports table
ALTER TABLE public.bug_reports 
ADD COLUMN assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add assignee_id column to suggestions table
ALTER TABLE public.suggestions 
ADD COLUMN assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for bug_reports assignee_id for faster queries
CREATE INDEX idx_bug_reports_assignee ON public.bug_reports(assignee_id) WHERE deleted_at IS NULL;

-- Create index for suggestions assignee_id for faster queries
CREATE INDEX idx_suggestions_assignee ON public.suggestions(assignee_id) WHERE deleted_at IS NULL;

-- Update RLS policies to allow assignees to update bug reports
DROP POLICY IF EXISTS "Authors and managers can update bugs" ON public.bug_reports;
CREATE POLICY "Authors, assignees and managers can update bugs" ON public.bug_reports FOR UPDATE USING (
    (reporter_id = auth.uid() OR assignee_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);

-- Update RLS policies to allow assignees to update suggestions
DROP POLICY IF EXISTS "Authors and managers can update suggestions" ON public.suggestions;
CREATE POLICY "Authors, assignees and managers can update suggestions" ON public.suggestions FOR UPDATE USING (
    (author_id = auth.uid() OR assignee_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);
