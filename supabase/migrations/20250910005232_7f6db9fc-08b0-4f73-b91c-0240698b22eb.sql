-- Update RLS policies to allow general bugs/suggestions (project_id can be null)
-- Update bug_reports table policies
DROP POLICY IF EXISTS "Project members can create bugs" ON public.bug_reports;
DROP POLICY IF EXISTS "Project members can view bugs" ON public.bug_reports;

CREATE POLICY "Users can create bugs" 
ON public.bug_reports 
FOR INSERT 
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view bugs" 
ON public.bug_reports 
FOR SELECT 
USING (
  (project_id IS NULL) OR 
  (project_id IS NOT NULL AND is_project_member(project_id)) AND 
  (deleted_at IS NULL)
);

-- Update suggestions table policies  
DROP POLICY IF EXISTS "Project members can create suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Project members can view suggestions" ON public.suggestions;

CREATE POLICY "Users can create suggestions" 
ON public.suggestions 
FOR INSERT 
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can view suggestions" 
ON public.suggestions 
FOR SELECT 
USING (
  (project_id IS NULL) OR 
  (project_id IS NOT NULL AND is_project_member(project_id)) AND 
  (deleted_at IS NULL)
);

-- Create votes table for voting system
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  vote_type BOOLEAN NOT NULL, -- true for upvote, false for downvote
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- Enable RLS for votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for votes
CREATE POLICY "Users can insert their own votes"
ON public.votes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view all votes"
ON public.votes
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own votes"
ON public.votes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes"
ON public.votes
FOR DELETE
USING (user_id = auth.uid());

-- Update comments policies to support general comments (project_id can be null)
DROP POLICY IF EXISTS "Project members can create comments" ON public.comments;
DROP POLICY IF EXISTS "Project members can view comments" ON public.comments;

CREATE POLICY "Users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can view comments" 
ON public.comments 
FOR SELECT 
USING (
  (project_id IS NULL) OR 
  (project_id IS NOT NULL AND is_project_member(project_id)) AND 
  (deleted_at IS NULL)
);

-- Make project_id nullable in bug_reports and suggestions if not already
-- (This should already be nullable based on the schema, but ensuring it's explicit)
ALTER TABLE public.bug_reports ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.suggestions ALTER COLUMN project_id DROP NOT NULL;