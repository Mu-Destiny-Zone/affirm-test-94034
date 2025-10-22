import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TestTube, Bug, Lightbulb, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ExternalLink, FileText, Send, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BugDetailDialog } from '@/components/bugs/BugDetailDialog';
import { SuggestionDetailDialog } from '@/components/suggestions/SuggestionDetailDialog';
import { TestExecutionDialog } from '@/components/tests/TestExecutionDialog';
import { BugReport, BugSeverity, Test } from '@/lib/types';

interface AssignedTest {
  id: string;
  test_id: string;
  due_date: string | null;
  state: string;
  step_results: any[];
  tests: {
    id: string;
    title: string;
    description: string;
    priority: number;
    steps: any[];
  };
}

interface UserBug {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: 'new' | 'triaged' | 'in_progress' | 'fixed' | 'closed' | 'duplicate' | "won't_fix";
  created_at: string;
  org_id: string;
  project_id: string | null;
  reporter_id: string;
  assignee_id: string | null;
  test_id: string | null;
  assignment_id: string | null;
  repro_steps: any[];
  duplicate_of: string | null;
  updated_at: string;
  deleted_at: string | null;
  youtube_url: string | null;
  tags: string[] | null;
  fix_notes: string | null;
  profiles?: {
    display_name: string | null;
    email: string;
  };
  projects: {
    name: string;
  } | null;
}

interface UserSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'new' | 'consider' | 'planned' | 'done' | 'rejected';
  created_at: string;
  updated_at: string;
  author_id: string;
  assignee_id: string | null;
  org_id: string;
  project_id: string | null;
  test_id: string | null;
  tags: string[] | null;
  profiles?: {
    id: string;
    display_name: string | null;
    email: string;
  };
  projects: {
    id: string;
    name: string;
  } | null;
  tests?: {
    id: string;
    title: string;
  } | null;
}

export function MyTasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests');

  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [userBugs, setUserBugs] = useState<UserBug[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);

  // Dialog states
  const [selectedBug, setSelectedBug] = useState<UserBug | null>(null);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<UserSuggestion | null>(null);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [executionDialogTest, setExecutionDialogTest] = useState<Test | null>(null);

  const [stats, setStats] = useState({
    pendingTests: 0,
    inProgressTests: 0,
    openBugs: 0,
    pendingSuggestions: 0,
  });

  // Quick action states
  const [quickComments, setQuickComments] = useState<Record<string, string>>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingSeverity, setUpdatingSeverity] = useState<string | null>(null);
  const [addingComment, setAddingComment] = useState<string | null>(null);

  useEffect(() => {
    if (user && currentOrg) {
      fetchMyTasks();
    }
  }, [user, currentOrg]);

  const fetchMyTasks = async () => {
    if (!currentOrg || !user) {
      setLoading(false);
      return;
    }

    try {
      const [testsResult, bugsResult, suggestionsResult] = await Promise.all([
        supabase
          .from('test_assignments')
          .select(`
            id,
            test_id,
            due_date,
            state,
            step_results,
            tests!inner (
              id,
              title,
              description,
              priority,
              steps
            )
          `)
          .eq('org_id', currentOrg.id)
          .eq('assignee_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),

        supabase
          .from('bug_reports')
          .select(`
            id,
            title,
            description,
            severity,
            status,
            created_at,
            updated_at,
            org_id,
            project_id,
            reporter_id,
            assignee_id,
            test_id,
            assignment_id,
            repro_steps,
            duplicate_of,
            deleted_at,
            youtube_url,
            tags,
            fix_notes,
            profiles!bug_reports_reporter_id_fkey (display_name, email),
            projects (name)
          `)
          .eq('org_id', currentOrg.id)
          .eq('assignee_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),

        supabase
          .from('suggestions')
          .select(`
            id,
            title,
            description,
            impact,
            status,
            created_at,
            updated_at,
            author_id,
            assignee_id,
            org_id,
            project_id,
            test_id,
            tags,
            profiles!suggestions_author_id_fkey(id, display_name, email),
            projects (id, name),
            tests (id, title)
          `)
          .eq('org_id', currentOrg.id)
          .eq('assignee_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      ]);

      if (testsResult.error) throw testsResult.error;
      if (bugsResult.error) throw bugsResult.error;
      if (suggestionsResult.error) throw suggestionsResult.error;

      setAssignedTests(testsResult.data as AssignedTest[] || []);
      setUserBugs(bugsResult.data as UserBug[] || []);
      setUserSuggestions(suggestionsResult.data as UserSuggestion[] || []);

      const pendingTests = (testsResult.data || []).filter((t: any) => t.state === 'assigned').length;
      const inProgressTests = (testsResult.data || []).filter((t: any) => t.state === 'in_progress').length;
      const openBugs = (bugsResult.data || []).filter((b: any) => b.status !== 'closed').length;
      const pendingSuggestions = (suggestionsResult.data || []).filter((s: any) => s.status === 'new').length;

      setStats({
        pendingTests,
        inProgressTests,
        openBugs,
        pendingSuggestions,
      });
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 0: return 'Low';
      case 1: return 'Medium';
      case 2: return 'High';
      case 3: return 'Critical';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 0: return 'secondary';
      case 1: return 'default';
      case 2: return 'destructive';
      case 3: return 'destructive';
      default: return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleBugClick = (bug: UserBug) => {
    setSelectedBug(bug);
    setBugDialogOpen(true);
  };

  const handleSuggestionClick = (suggestion: UserSuggestion) => {
    setSelectedSuggestion(suggestion);
    setSuggestionDialogOpen(true);
  };

  const handleBugEdit = (bug: any) => {
    setBugDialogOpen(false);
    navigate('/bugs');
  };

  const handleSuggestionEdit = (suggestion: any) => {
    setSuggestionDialogOpen(false);
    navigate('/suggestions');
  };

  // Quick action handlers
  const handleBugStatusChange = async (bugId: string, newStatus: string) => {
    setUpdatingStatus(bugId);
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus as 'new' | 'triaged' | 'in_progress' | 'fixed' | 'closed' | 'duplicate' | "won't_fix" })
        .eq('id', bugId);

      if (error) throw error;

      const updatedBugs = userBugs.map(bug => 
        bug.id === bugId ? { ...bug, status: newStatus as any } : bug
      );
      setUserBugs(updatedBugs);
      
      // Update stats
      const openBugs = updatedBugs.filter(b => b.status !== 'closed').length;
      setStats(prev => ({ ...prev, openBugs }));
      
      toast({
        title: 'Success',
        description: 'Bug status updated'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleBugSeverityChange = async (bugId: string, newSeverity: string) => {
    setUpdatingSeverity(bugId);
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ severity: newSeverity as 'low' | 'medium' | 'high' | 'critical' })
        .eq('id', bugId);

      if (error) throw error;

      const updatedBugs = userBugs.map(bug => 
        bug.id === bugId ? { ...bug, severity: newSeverity as BugSeverity } : bug
      );
      setUserBugs(updatedBugs);
      
      toast({
        title: 'Success',
        description: 'Bug severity updated'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUpdatingSeverity(null);
    }
  };

  const handleSuggestionStatusChange = async (suggestionId: string, newStatus: string) => {
    setUpdatingStatus(suggestionId);
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status: newStatus as 'new' | 'consider' | 'planned' | 'done' | 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      const updatedSuggestions = userSuggestions.map(suggestion => 
        suggestion.id === suggestionId ? { ...suggestion, status: newStatus as any } : suggestion
      );
      setUserSuggestions(updatedSuggestions);
      
      // Update stats
      const pendingSuggestions = updatedSuggestions.filter(s => s.status === 'new').length;
      setStats(prev => ({ ...prev, pendingSuggestions }));
      
      toast({
        title: 'Success',
        description: 'Suggestion status updated'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddComment = async (entityType: 'bug' | 'suggestion' | 'test', entityId: string) => {
    const commentText = quickComments[entityId];
    if (!commentText?.trim() || !user || !currentOrg) return;

    setAddingComment(entityId);
    try {
      const { error } = await supabase.from('comments').insert({
        body: commentText,
        author_id: user.id,
        org_id: currentOrg.id,
        target_type: entityType,
        target_id: entityId
      });

      if (error) throw error;

      setQuickComments(prev => ({ ...prev, [entityId]: '' }));
      toast({
        title: 'Success',
        description: 'Comment added'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setAddingComment(null);
    }
  };

  if (loading || !currentOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{t('myTasks')}</h1>
          <p className="text-muted-foreground text-lg mt-2">
            {!currentOrg ? 'Please select an organization' : 'Loading your tasks...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-8 animate-fade-in">
      {/* Enhanced Header with Quick Actions */}
      <div className="mb-2 sm:mb-6 pb-2 sm:pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 sm:p-2 bg-gradient-brand rounded-lg shadow-brand">
                <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-lg sm:text-2xl lg:text-3xl font-bold">My Tasks</span>
            </h1>
            <p className="text-[10px] sm:text-sm text-muted-foreground ml-[26px] sm:ml-0">
              View and manage your assigned tests, bugs, and suggestions
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-1.5 sm:gap-2">
            <Button 
              onClick={() => navigate('/bugs')} 
              variant="destructive" 
              size="sm"
              className="shadow-lg hover:shadow-xl transition-all flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Bug className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Report Bug</span>
            </Button>
            <Button 
              onClick={() => navigate('/suggestions')} 
              size="sm"
              className="btn-gradient shadow-lg flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Suggestion</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        <div className="stat-card p-2.5 sm:p-5 cursor-pointer" onClick={() => setActiveTab('tests')}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 bg-primary/10 rounded-lg flex-shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Assigned Tests</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">{stats.pendingTests}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">awaiting</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card p-2.5 sm:p-5 cursor-pointer" onClick={() => setActiveTab('bugs')}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 bg-destructive/10 rounded-lg flex-shrink-0">
              <Bug className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Assigned Bugs</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-destructive">{stats.openBugs}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">assigned</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card p-2.5 sm:p-5 cursor-pointer" onClick={() => setActiveTab('suggestions')}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 bg-warning/10 rounded-lg flex-shrink-0">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">Suggestions</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-warning">{stats.pendingSuggestions}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-card border border-border/60 p-1 sm:p-1.5 rounded-xl shadow-sm h-auto inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger 
              value="tests" 
              className="data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-2 sm:px-6 py-1.5 sm:py-3 transition-all text-[10px] sm:text-sm whitespace-nowrap"
            >
              <TestTube className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="font-medium">Tests</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-background/20 text-current border-0 text-[9px] sm:text-xs px-1 sm:px-2">
                {assignedTests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="bugs" 
              className="data-[state=active]:bg-destructive data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-2 sm:px-6 py-1.5 sm:py-3 transition-all text-[10px] sm:text-sm whitespace-nowrap"
            >
              <Bug className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="font-medium">Bugs</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-background/20 text-current border-0 text-[9px] sm:text-xs px-1 sm:px-2">
                {userBugs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="suggestions" 
              className="data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-2 sm:px-6 py-1.5 sm:py-3 transition-all text-[10px] sm:text-sm whitespace-nowrap"
            >
              <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="font-medium">Ideas</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-background/20 text-current border-0 text-[9px] sm:text-xs px-1 sm:px-2">
                {userSuggestions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tests" className="space-y-4 animate-fade-in">
          {assignedTests.length === 0 ? (
            <Card className="glass border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-full mb-3 sm:mb-4">
                  <TestTube className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No assigned tests</h3>
                <p className="text-muted-foreground text-center max-w-md text-sm">
                  You don't have any tests assigned to you at the moment. Check back later or contact your project manager.
                </p>
                <Button onClick={() => navigate('/tests')} className="mt-4 sm:mt-6 btn-gradient" size="sm">
                  <TestTube className="h-4 w-4 mr-2" />
                  Browse All Tests
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {assignedTests.map((assignment, index) => (
                <Card 
                  key={assignment.id} 
                  className="card-interactive border-border/60 hover:border-primary/30 animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-3 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <TestTube className="h-5 w-5 text-primary" />
                          </div>
                          <Badge 
                            variant={getPriorityColor(assignment.tests.priority)} 
                            className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] font-bold"
                          >
                            {assignment.tests.priority === 3 ? 'P0' : assignment.tests.priority === 2 ? 'P1' : assignment.tests.priority === 1 ? 'P2' : 'P3'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm line-clamp-1">{assignment.tests.title}</h3>
                          <Button
                            size="sm"
                            onClick={() => setExecutionDialogTest(assignment.tests as Test)}
                            className="btn-gradient h-6 w-6 p-0 flex-shrink-0"
                            title="Execute Test"
                          >
                            <TestTube className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                          {assignment.tests.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${
                            assignment.state === 'assigned' ? 'bg-primary/10 text-primary' :
                            assignment.state === 'in_progress' ? 'bg-info/10 text-info' :
                            assignment.state === 'done' ? 'bg-success/10 text-success' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              assignment.state === 'assigned' ? 'bg-primary' :
                              assignment.state === 'in_progress' ? 'bg-info' :
                              assignment.state === 'done' ? 'bg-success' :
                              'bg-muted-foreground'
                            }`}></span>
                            {assignment.state === 'assigned' ? 'Assigned' : assignment.state === 'in_progress' ? 'In Progress' : 'Completed'}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>{assignment.tests.steps?.length || 0} steps</span>
                          </div>
                          {assignment.due_date && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <div className="flex items-center gap-1 text-warning">
                                <AlertCircle className="h-3 w-3" />
                                <span className="flex-shrink-0">{format(new Date(assignment.due_date), 'MMM dd')}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bugs" className="space-y-4 animate-fade-in">
          {userBugs.length === 0 ? (
            <Card className="glass border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16">
                <div className="p-3 sm:p-4 bg-destructive/10 rounded-full mb-3 sm:mb-4">
                  <Bug className="h-10 w-10 sm:h-16 sm:w-16 text-destructive" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No bugs assigned</h3>
                <p className="text-muted-foreground text-center max-w-md text-sm">
                  You don't have any bugs assigned to you at the moment. Check back later or contact your manager.
                </p>
                <Button onClick={() => navigate('/bugs')} variant="destructive" className="mt-4 sm:mt-6 shadow-md" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  View All Bugs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {userBugs.map((bug, index) => (
                <Card 
                  key={bug.id} 
                  className="card-interactive border-border/60 hover:border-destructive/30 animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-3 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="p-2 bg-destructive/10 rounded-lg">
                            <Bug className="h-5 w-5 text-destructive" />
                          </div>
                          <Badge 
                            variant={getSeverityColor(bug.severity)} 
                            className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] font-bold"
                          >
                            {bug.severity === 'critical' ? 'C' : bug.severity === 'high' ? 'H' : bug.severity === 'medium' ? 'M' : 'L'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm line-clamp-1">{bug.title}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleBugClick(bug)}
                            className="h-6 w-6 p-0 flex-shrink-0 hover:bg-destructive/10"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                          {bug.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${
                            bug.status === 'new' ? 'bg-primary/10 text-primary' :
                            bug.status === 'triaged' ? 'bg-warning/10 text-warning' :
                            bug.status === 'in_progress' ? 'bg-info/10 text-info' :
                            bug.status === 'fixed' ? 'bg-success/10 text-success' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              bug.status === 'new' ? 'bg-primary' :
                              bug.status === 'triaged' ? 'bg-warning' :
                              bug.status === 'in_progress' ? 'bg-info' :
                              bug.status === 'fixed' ? 'bg-success' :
                              'bg-muted-foreground'
                            }`}></span>
                            {bug.status.replace('_', ' ')}
                          </span>
                          {bug.projects && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-muted-foreground truncate">{bug.projects.name}</span>
                            </>
                          )}
                          <span className="ml-auto text-muted-foreground/60 flex-shrink-0">{format(new Date(bug.created_at), 'MMM dd')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                      <Select 
                        value={bug.status} 
                        onValueChange={(value) => handleBugStatusChange(bug.id, value)}
                        disabled={updatingStatus === bug.id}
                      >
                        <SelectTrigger className="h-7 text-[11px] flex-1" data-testid={`bug-status-select-${bug.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="triaged">Triaged</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="won't_fix">Won't Fix</SelectItem>
                          <SelectItem value="duplicate">Duplicate</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select 
                        value={bug.severity} 
                        onValueChange={(value) => handleBugSeverityChange(bug.id, value)}
                        disabled={updatingSeverity === bug.id}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-24" data-testid={`bug-severity-select-${bug.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Comment..."
                        value={quickComments[bug.id] || ''}
                        onChange={(e) => setQuickComments(prev => ({ ...prev, [bug.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment('bug', bug.id);
                          }
                        }}
                        disabled={addingComment === bug.id}
                        className="flex-1 h-7 text-[11px]"
                        data-testid={`bug-comment-input-${bug.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddComment('bug', bug.id)}
                        disabled={!quickComments[bug.id]?.trim() || addingComment === bug.id}
                        className="h-7 px-2"
                        data-testid={`bug-comment-submit-${bug.id}`}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {userSuggestions.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Lightbulb className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No suggestions assigned</h3>
                <p className="text-muted-foreground text-center">
                  You don't have any suggestions assigned to you at the moment
                </p>
                <Button onClick={() => navigate('/suggestions')} className="mt-4 sm:mt-6 btn-gradient" size="sm">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  View All Suggestions
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {userSuggestions.map((suggestion, index) => (
                <Card 
                  key={suggestion.id} 
                  className="card-interactive border-border/60 hover:border-warning/30 animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-3 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="p-2 bg-warning/10 rounded-lg">
                            <Lightbulb className="h-5 w-5 text-warning" />
                          </div>
                          <Badge 
                            variant={suggestion.impact === 'high' ? 'destructive' : suggestion.impact === 'medium' ? 'default' : 'secondary'} 
                            className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] font-bold"
                          >
                            {suggestion.impact === 'high' ? 'H' : suggestion.impact === 'medium' ? 'M' : 'L'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm line-clamp-1">{suggestion.title}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="h-6 w-6 p-0 flex-shrink-0 hover:bg-warning/10"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                          {suggestion.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${
                            suggestion.status === 'new' ? 'bg-primary/10 text-primary' :
                            suggestion.status === 'consider' ? 'bg-warning/10 text-warning' :
                            suggestion.status === 'planned' ? 'bg-info/10 text-info' :
                            suggestion.status === 'done' ? 'bg-success/10 text-success' :
                            suggestion.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              suggestion.status === 'new' ? 'bg-primary' :
                              suggestion.status === 'consider' ? 'bg-warning' :
                              suggestion.status === 'planned' ? 'bg-info' :
                              suggestion.status === 'done' ? 'bg-success' :
                              suggestion.status === 'rejected' ? 'bg-destructive' :
                              'bg-muted-foreground'
                            }`}></span>
                            {suggestion.status === 'consider' ? 'Under Review' : suggestion.status.replace('_', ' ')}
                          </span>
                          {suggestion.projects && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-muted-foreground truncate">{suggestion.projects.name}</span>
                            </>
                          )}
                          <span className="ml-auto text-muted-foreground/60 flex-shrink-0">{format(new Date(suggestion.created_at), 'MMM dd')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                      <Select 
                        value={suggestion.status} 
                        onValueChange={(value) => handleSuggestionStatusChange(suggestion.id, value)}
                        disabled={updatingStatus === suggestion.id}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-32" data-testid={`suggestion-status-select-${suggestion.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="consider">Consider</SelectItem>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Comment..."
                        value={quickComments[suggestion.id] || ''}
                        onChange={(e) => setQuickComments(prev => ({ ...prev, [suggestion.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment('suggestion', suggestion.id);
                          }
                        }}
                        disabled={addingComment === suggestion.id}
                        className="flex-1 h-7 text-[11px]"
                        data-testid={`suggestion-comment-input-${suggestion.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddComment('suggestion', suggestion.id)}
                        disabled={!quickComments[suggestion.id]?.trim() || addingComment === suggestion.id}
                        className="h-7 px-2"
                        data-testid={`suggestion-comment-submit-${suggestion.id}`}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bug Detail Dialog */}
      <BugDetailDialog
        open={bugDialogOpen}
        onOpenChange={setBugDialogOpen}
        bug={selectedBug as any}
        onEdit={handleBugEdit}
      />

      {/* Suggestion Detail Dialog */}
      <SuggestionDetailDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
        suggestion={selectedSuggestion as any}
        onEdit={handleSuggestionEdit}
        onStatusChange={fetchMyTasks}
      />

      {/* Test Execution Dialog */}
      <TestExecutionDialog
        test={executionDialogTest}
        open={!!executionDialogTest}
        onOpenChange={(open) => !open && setExecutionDialogTest(null)}
        onExecutionComplete={fetchMyTasks}
      />
    </div>
  );
}
