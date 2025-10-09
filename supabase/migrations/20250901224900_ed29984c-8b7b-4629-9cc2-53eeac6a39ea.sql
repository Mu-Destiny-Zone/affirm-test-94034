-- Drop existing types if they exist to start fresh
DROP TYPE IF EXISTS app_role CASCADE;
DROP TYPE IF EXISTS locale_type CASCADE;
DROP TYPE IF EXISTS theme_type CASCADE;
DROP TYPE IF EXISTS test_status CASCADE;
DROP TYPE IF EXISTS assignment_state CASCADE;
DROP TYPE IF EXISTS bug_severity CASCADE;
DROP TYPE IF EXISTS bug_status CASCADE;
DROP TYPE IF EXISTS suggestion_impact CASCADE;
DROP TYPE IF EXISTS suggestion_status CASCADE;
DROP TYPE IF EXISTS target_type CASCADE;

-- Create custom types
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'tester', 'viewer');
CREATE TYPE locale_type AS ENUM ('en', 'bg');
CREATE TYPE theme_type AS ENUM ('dark', 'light', 'system');
CREATE TYPE test_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE assignment_state AS ENUM ('assigned', 'in_progress', 'blocked', 'done');
CREATE TYPE bug_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE bug_status AS ENUM ('new', 'triaged', 'in_progress', 'fixed', 'won''t_fix', 'duplicate', 'closed');
CREATE TYPE suggestion_impact AS ENUM ('low', 'medium', 'high');
CREATE TYPE suggestion_status AS ENUM ('new', 'consider', 'planned', 'done', 'rejected');
CREATE TYPE target_type AS ENUM ('bug', 'suggestion', 'test');

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create profiles table (matches auth.users.id)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    locale locale_type DEFAULT 'en',
    theme theme_type DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create orgs table
CREATE TABLE public.orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create org_members table
CREATE TABLE public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(org_id, profile_id)
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(org_id, slug)
);

-- Create project_members table
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role_override app_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, profile_id)
);

-- Create tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status test_status DEFAULT 'draft',
    priority INTEGER DEFAULT 0,
    tags TEXT[],
    steps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create test_assignments table
CREATE TABLE public.test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    due_date DATE,
    state assignment_state DEFAULT 'assigned',
    notes TEXT,
    step_results JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(test_id, assignee_id)
);

-- Create bug_reports table
CREATE TABLE public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id),
    assignment_id UUID REFERENCES public.test_assignments(id),
    title TEXT NOT NULL,
    description TEXT,
    severity bug_severity DEFAULT 'medium',
    status bug_status DEFAULT 'new',
    repro_steps JSONB DEFAULT '[]'::jsonb,
    youtube_url TEXT,
    tags TEXT[],
    duplicate_of UUID REFERENCES public.bug_reports(id),
    fix_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create suggestions table
CREATE TABLE public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id),
    title TEXT NOT NULL,
    description TEXT,
    impact suggestion_impact DEFAULT 'medium',
    status suggestion_status DEFAULT 'new',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_type target_type NOT NULL,
    target_id UUID NOT NULL,
    body TEXT NOT NULL,
    mentions UUID[],
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create labels table
CREATE TABLE public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280',
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, name)
);

-- Create activity_log table
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_orgs_slug ON public.orgs(slug);
CREATE INDEX idx_org_members_org_profile ON public.org_members(org_id, profile_id);
CREATE INDEX idx_projects_org_slug ON public.projects(org_id, slug);
CREATE INDEX idx_project_members_project_profile ON public.project_members(project_id, profile_id);
CREATE INDEX idx_tests_project ON public.tests(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_test_assignments_assignee ON public.test_assignments(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bug_reports_project ON public.bug_reports(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_suggestions_project ON public.suggestions(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_target ON public.comments(target_type, target_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_log_org_project ON public.activity_log(org_id, project_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at);

-- Create full-text search indexes
CREATE INDEX idx_tests_fulltext ON public.tests USING gin ((title || ' ' || COALESCE(description, '')) gin_trgm_ops);
CREATE INDEX idx_bug_reports_fulltext ON public.bug_reports USING gin ((title || ' ' || COALESCE(description, '')) gin_trgm_ops);
CREATE INDEX idx_suggestions_fulltext ON public.suggestions USING gin ((title || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON public.orgs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_test_assignments_updated_at BEFORE UPDATE ON public.test_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bug_reports_updated_at BEFORE UPDATE ON public.bug_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON public.suggestions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON public.labels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile when user signs up
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Helper Functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.org_role(org_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Org admins can view member profiles" ON public.profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.org_members om1, public.org_members om2
        WHERE om1.profile_id = auth.uid() AND om1.role = 'admin' AND om1.deleted_at IS NULL
        AND om2.profile_id = profiles.id AND om2.org_id = om1.org_id AND om2.deleted_at IS NULL
    )
);

-- Orgs RLS Policies
CREATE POLICY "Org members can view org" ON public.orgs FOR SELECT USING (public.is_org_member(id) AND deleted_at IS NULL);
CREATE POLICY "Org admins can update org" ON public.orgs FOR UPDATE USING (public.is_org_admin(id) AND deleted_at IS NULL);
CREATE POLICY "Org admins can insert org" ON public.orgs FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Org Members RLS Policies  
CREATE POLICY "Users can view own org membership" ON public.org_members FOR SELECT USING ((profile_id = auth.uid() OR public.is_org_admin(org_id)) AND deleted_at IS NULL);
CREATE POLICY "Org admins can manage members" ON public.org_members FOR ALL USING (public.is_org_admin(org_id) AND deleted_at IS NULL);
CREATE POLICY "Org admins can insert members" ON public.org_members FOR INSERT WITH CHECK (public.is_org_admin(org_id));

-- Projects RLS Policies
CREATE POLICY "Project members can view project" ON public.projects FOR SELECT USING (public.is_project_member(id) AND deleted_at IS NULL);
CREATE POLICY "Project admins/managers can update project" ON public.projects FOR UPDATE USING (
    (public.project_role(id) IN ('admin', 'manager') OR owner_id = auth.uid()) AND deleted_at IS NULL
);
CREATE POLICY "Org admins/managers can insert project" ON public.projects FOR INSERT WITH CHECK (
    public.org_role(org_id) IN ('admin', 'manager')
);

-- Project Members RLS Policies
CREATE POLICY "Project members can view project membership" ON public.project_members FOR SELECT USING (
    (profile_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);
CREATE POLICY "Project admins/managers can manage members" ON public.project_members FOR ALL USING (
    public.project_role(project_id) IN ('admin', 'manager') AND deleted_at IS NULL
);

-- Tests RLS Policies
CREATE POLICY "Project members can view tests" ON public.tests FOR SELECT USING (public.is_project_member(project_id) AND deleted_at IS NULL);
CREATE POLICY "Project admins/managers can manage tests" ON public.tests FOR ALL USING (
    public.project_role(project_id) IN ('admin', 'manager') AND deleted_at IS NULL
);
CREATE POLICY "Project admins/managers can insert tests" ON public.tests FOR INSERT WITH CHECK (
    public.project_role(project_id) IN ('admin', 'manager')
);

-- Test Assignments RLS Policies
CREATE POLICY "Assignees and managers can view assignments" ON public.test_assignments FOR SELECT USING (
    (assignee_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);
CREATE POLICY "Project admins/managers can manage assignments" ON public.test_assignments FOR ALL USING (
    public.project_role(project_id) IN ('admin', 'manager') AND deleted_at IS NULL
);
CREATE POLICY "Assignees can update own assignment state" ON public.test_assignments FOR UPDATE USING (
    assignee_id = auth.uid() AND deleted_at IS NULL
);

-- Bug Reports RLS Policies
CREATE POLICY "Project members can view bugs" ON public.bug_reports FOR SELECT USING (public.is_project_member(project_id) AND deleted_at IS NULL);
CREATE POLICY "Project members can create bugs" ON public.bug_reports FOR INSERT WITH CHECK (
    public.is_project_member(project_id) AND reporter_id = auth.uid()
);
CREATE POLICY "Authors and managers can update bugs" ON public.bug_reports FOR UPDATE USING (
    (reporter_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);

-- Suggestions RLS Policies
CREATE POLICY "Project members can view suggestions" ON public.suggestions FOR SELECT USING (public.is_project_member(project_id) AND deleted_at IS NULL);
CREATE POLICY "Project members can create suggestions" ON public.suggestions FOR INSERT WITH CHECK (
    public.is_project_member(project_id) AND author_id = auth.uid()
);
CREATE POLICY "Authors and managers can update suggestions" ON public.suggestions FOR UPDATE USING (
    (author_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);

-- Comments RLS Policies
CREATE POLICY "Project members can view comments" ON public.comments FOR SELECT USING (public.is_project_member(project_id) AND deleted_at IS NULL);
CREATE POLICY "Project members can create comments" ON public.comments FOR INSERT WITH CHECK (
    public.is_project_member(project_id) AND author_id = auth.uid()
);
CREATE POLICY "Authors and managers can update comments" ON public.comments FOR UPDATE USING (
    (author_id = auth.uid() OR public.project_role(project_id) IN ('admin', 'manager')) AND deleted_at IS NULL
);

-- Labels RLS Policies
CREATE POLICY "Project members can view labels" ON public.labels FOR SELECT USING (public.is_project_member(project_id) AND deleted_at IS NULL);
CREATE POLICY "Project admins/managers can manage labels" ON public.labels FOR ALL USING (
    public.project_role(project_id) IN ('admin', 'manager') AND deleted_at IS NULL
);

-- Activity Log RLS Policies
CREATE POLICY "Project members can view activity" ON public.activity_log FOR SELECT USING (
    project_id IS NULL OR public.is_project_member(project_id)
);
CREATE POLICY "Users can insert activity" ON public.activity_log FOR INSERT WITH CHECK (actor_id = auth.uid());

-- Notifications RLS Policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;