-- Fix votes table RLS policy to restrict access to org members only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all votes" ON public.votes;

-- Create new policy that restricts votes visibility to org members
CREATE POLICY "Users can view votes in their orgs"
ON public.votes
FOR SELECT
TO authenticated
USING (
  CASE target_type
    WHEN 'bug' THEN 
      EXISTS (
        SELECT 1 FROM public.bug_reports br
        WHERE br.id = votes.target_id
        AND public.is_org_member(br.org_id)
      )
    WHEN 'suggestion' THEN
      EXISTS (
        SELECT 1 FROM public.suggestions s
        WHERE s.id = votes.target_id
        AND public.is_org_member(s.org_id)
      )
    ELSE false
  END
);