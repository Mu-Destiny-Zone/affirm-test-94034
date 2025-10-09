export type AppRole = 'admin' | 'manager' | 'tester' | 'viewer';
export type Locale = 'en' | 'bg';
export type Theme = 'dark' | 'light' | 'system';
export type TestStatus = 'draft' | 'active' | 'archived';
export type AssignmentState = 'assigned' | 'in_progress' | 'blocked' | 'done';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'new' | 'triaged' | 'in_progress' | 'fixed' | "won't_fix" | 'duplicate' | 'closed';
export type SuggestionImpact = 'low' | 'medium' | 'high';
export type SuggestionStatus = 'new' | 'consider' | 'planned' | 'done' | 'rejected';
export type TargetType = 'bug' | 'suggestion' | 'test';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  locale: Locale;
  theme: Theme;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrgMember {
  id: string;
  org_id: string;
  profile_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: Profile;
}

export interface Test {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: TestStatus;
  priority: number;
  tags: string[];
  steps: TestStep[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TestStep {
  title: string;
  expected: string;
  required: boolean;
}

export interface TestAssignment {
  id: string;
  org_id: string;
  test_id: string;
  assignee_id: string;
  due_date: string | null;
  state: AssignmentState;
  notes: string | null;
  step_results: StepResult[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tests?: Test;
  profiles?: Profile;
}

export interface StepResult {
  step_index: number;
  status: 'pass' | 'fail' | 'skip';
  notes?: string;
  youtube_url?: string;
}

export interface BugReport {
  id: string;
  org_id: string;
  reporter_id: string;
  test_id: string | null;
  assignment_id: string | null;
  title: string;
  description: string | null;
  severity: BugSeverity;
  status: BugStatus;
  repro_steps: any[];
  youtube_url: string | null;
  tags: string[];
  duplicate_of: string | null;
  fix_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: Profile;
  tests?: Test;
  test_assignments?: TestAssignment;
}

export interface Suggestion {
  id: string;
  org_id: string;
  author_id: string;
  test_id: string | null;
  title: string;
  description: string | null;
  impact: SuggestionImpact;
  status: SuggestionStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: Profile;
  tests?: Test;
}

export interface Comment {
  id: string;
  org_id: string;
  author_id: string;
  target_type: TargetType;
  target_id: string;
  body: string;
  mentions: string[];
  reactions: Record<string, number>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profiles?: Profile;
}

export interface Label {
  id: string;
  org_id: string;
  name: string;
  color: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  title: string;
  message: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}