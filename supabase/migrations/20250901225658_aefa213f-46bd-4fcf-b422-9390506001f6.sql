-- Fix security warnings: Add SET search_path to all functions
-- Update RLS helper functions to have proper search_path

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members om
        WHERE om.org_id = is_org_member.org_id 
        AND om.profile_id = auth.uid()
        AND om.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.org_role(org_id UUID)
RETURNS app_role AS $$
BEGIN
    RETURN (
        SELECT om.role FROM public.org_members om
        WHERE om.org_id = org_role.org_id 
        AND om.profile_id = auth.uid()
        AND om.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.org_role(org_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_project_member(project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    proj_org_id UUID;
BEGIN
    SELECT p.org_id INTO proj_org_id FROM public.projects p WHERE p.id = is_project_member.project_id;
    
    -- Check if user is org member or explicit project member
    RETURN public.is_org_member(proj_org_id) OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = is_project_member.project_id 
        AND pm.profile_id = auth.uid()
        AND pm.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.project_role(project_id UUID)
RETURNS app_role AS $$
DECLARE
    proj_org_id UUID;
    override_role app_role;
    org_user_role app_role;
BEGIN
    SELECT p.org_id INTO proj_org_id FROM public.projects p WHERE p.id = project_role.project_id;
    
    -- Check for project role override
    SELECT pm.role_override INTO override_role 
    FROM public.project_members pm
    WHERE pm.project_id = project_role.project_id 
    AND pm.profile_id = auth.uid()
    AND pm.deleted_at IS NULL;
    
    IF override_role IS NOT NULL THEN
        RETURN override_role;
    END IF;
    
    -- Fall back to org role
    RETURN public.org_role(proj_org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Fix the user creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix the update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;