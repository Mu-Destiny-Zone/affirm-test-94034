-- Add owner_id column to bug_reports
ALTER TABLE public.bug_reports 
ADD COLUMN owner_id UUID REFERENCES public.profiles(id);

-- Add owner_id column to suggestions
ALTER TABLE public.suggestions 
ADD COLUMN owner_id UUID REFERENCES public.profiles(id);

-- Update RLS policy for bug_reports to allow owners to edit
DROP POLICY IF EXISTS "Authors and org managers can update bugs" ON public.bug_reports;

CREATE POLICY "Authors, owners, and org managers can update bugs" 
ON public.bug_reports 
FOR UPDATE 
USING (
  (reporter_id = auth.uid() OR owner_id = auth.uid() OR org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) 
  AND deleted_at IS NULL
);

-- Update RLS policy for suggestions to allow owners to edit
DROP POLICY IF EXISTS "Authors and org managers can update suggestions" ON public.suggestions;

CREATE POLICY "Authors, owners, and org managers can update suggestions" 
ON public.suggestions 
FOR UPDATE 
USING (
  (author_id = auth.uid() OR owner_id = auth.uid() OR org_role(org_id) = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) 
  AND deleted_at IS NULL
);