-- Add DELETE policy for comments
-- Allow users to delete their own comments and org admins to delete any comment
CREATE POLICY "Users and org admins can delete comments"
ON public.comments
FOR DELETE
USING (
  (author_id = auth.uid()) OR 
  (org_role(org_id) = 'admin')
);