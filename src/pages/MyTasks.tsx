import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TestTube, Bug, Lightbulb, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ExternalLink, FileText } from 'lucide-react';
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
            test_id,
            assignment_id,
            repro_steps,
            duplicate_of,
            deleted_at,
            youtube_url,
            tags,
            fix_notes,
            profiles (display_name, email),
            projects (name)
          `)
          .eq('org_id', currentOrg.id)
          .eq('reporter_id', user.id)
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
            org_id,
            project_id,
            test_id,
            tags,
            profiles!suggestions_author_id_fkey(id, display_name, email),
            projects (id, name),
            tests (id, title)
          `)
          .eq('org_id', currentOrg.id)
          .eq('author_id', user.id)
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
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header with Quick Actions */}
      <div className="page-header">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="page-title flex items-center gap-3">
              <div className="p-2 bg-gradient-brand rounded-lg shadow-brand">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl lg:text-4xl">My Tasks</span>
            </h1>
            <p className="page-subtitle text-sm sm:text-base">
              View and manage your assigned tests, bugs, and suggestions
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button 
              onClick={() => navigate('/bugs')} 
              variant="destructive" 
              size="default"
              className="shadow-lg hover:shadow-xl transition-all flex-1 sm:flex-none"
            >
              <Bug className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
              <span className="hidden sm:inline">Report Bug</span>
            </Button>
            <Button 
              onClick={() => navigate('/suggestions')} 
              size="default"
              className="btn-gradient shadow-lg flex-1 sm:flex-none"
            >
              <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
              <span className="hidden sm:inline">Add Suggestion</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="stat-card p-6 cursor-pointer" onClick={() => setActiveTab('tests')}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">Pending</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Assigned Tests</p>
            <p className="text-3xl font-bold tracking-tight text-primary">{stats.pendingTests}</p>
            <p className="text-xs text-muted-foreground">Awaiting execution</p>
          </div>
        </div>

        <div className="stat-card p-6 cursor-pointer" onClick={() => setActiveTab('bugs')}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-destructive/10 rounded-xl">
              <Bug className="h-6 w-6 text-destructive" />
            </div>
            <Badge variant="destructive" className="text-xs">Open</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Open Bugs</p>
            <p className="text-3xl font-bold tracking-tight text-destructive">{stats.openBugs}</p>
            <p className="text-xs text-muted-foreground">Bugs you reported</p>
          </div>
        </div>

        <div className="stat-card p-6 cursor-pointer" onClick={() => setActiveTab('suggestions')}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-warning/10 rounded-xl">
              <Lightbulb className="h-6 w-6 text-warning" />
            </div>
            <Badge variant="secondary" className="text-xs">Pending</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Suggestions</p>
            <p className="text-3xl font-bold tracking-tight text-warning">{stats.pendingSuggestions}</p>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-card border border-border/60 p-1.5 rounded-xl shadow-sm h-auto inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger 
              value="tests" 
              className="data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 sm:px-6 py-2 sm:py-3 transition-all text-xs sm:text-sm whitespace-nowrap"
            >
              <TestTube className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">Assigned Tests</span>
              <span className="sm:hidden font-medium">Tests</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-background/20 text-current border-0 text-xs">
                {assignedTests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="bugs" 
              className="data-[state=active]:bg-destructive data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 sm:px-6 py-2 sm:py-3 transition-all text-xs sm:text-sm whitespace-nowrap"
            >
              <Bug className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">My Bugs</span>
              <span className="sm:hidden font-medium">Bugs</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-background/20 text-current border-0 text-xs">
                {userBugs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="suggestions" 
              className="data-[state=active]:bg-gradient-brand data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 sm:px-6 py-2 sm:py-3 transition-all text-xs sm:text-sm whitespace-nowrap"
            >
              <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">My Suggestions</span>
              <span className="sm:hidden font-medium">Ideas</span>
              <Badge variant="secondary" className="ml-1 sm:ml-2 bg-background/20 text-current border-0 text-xs">
                {userSuggestions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tests" className="space-y-4 animate-fade-in">
          {assignedTests.length === 0 ? (
            <Card className="glass border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <TestTube className="h-16 w-16 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No assigned tests</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  You don't have any tests assigned to you at the moment. Check back later or contact your project manager.
                </p>
                <Button onClick={() => navigate('/tests')} className="mt-6 btn-gradient">
                  <TestTube className="h-4 w-4 mr-2" />
                  Browse All Tests
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignedTests.map((assignment, index) => (
                <Card 
                  key={assignment.id} 
                  className="card-interactive border-border/60 hover:border-primary/30 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <TestTube className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl font-bold mb-1">{assignment.tests.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant={getPriorityColor(assignment.tests.priority)} className="text-xs">
                                {getPriorityLabel(assignment.tests.priority)}
                              </Badge>
                              {assignment.state === 'assigned' && (
                                <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Assigned
                                </Badge>
                              )}
                              {assignment.state === 'in_progress' && (
                                <Badge variant="outline" className="text-xs bg-info/5 border-info/20">
                                  <TestTube className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                              {assignment.state === 'done' && (
                                <Badge variant="outline" className="text-xs bg-success/5 border-success/20">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 ml-14">
                          {assignment.tests.description}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        onClick={() => setExecutionDialogTest(assignment.tests as Test)}
                        className="btn-gradient gap-2 shadow-md"
                      >
                        <TestTube className="h-4 w-4" />
                        Execute Test
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-background rounded">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium">{assignment.tests.steps?.length || 0} steps</span>
                      </div>
                      {assignment.due_date && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <span>Due: {format(new Date(assignment.due_date), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bugs" className="space-y-4 animate-fade-in">
          {userBugs.length === 0 ? (
            <Card className="glass border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 bg-destructive/10 rounded-full mb-4">
                  <Bug className="h-16 w-16 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No bugs reported</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  You haven't reported any bugs yet. Found an issue? Report it now!
                </p>
                <Button onClick={() => navigate('/bugs')} variant="destructive" className="mt-6 shadow-md">
                  <Bug className="h-4 w-4 mr-2" />
                  Report Your First Bug
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {userBugs.map((bug, index) => (
                <Card 
                  key={bug.id} 
                  className="card-interactive border-border/60 hover:border-destructive/30 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-destructive/10 rounded-lg">
                            <Bug className="h-5 w-5 text-destructive" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl font-bold mb-1">{bug.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(bug.severity)} className="text-xs">
                                {bug.severity}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <span className={`w-2 h-2 rounded-full mr-1.5 ${
                                  bug.status === 'new' ? 'bg-primary' :
                                  bug.status === 'triaged' ? 'bg-warning' :
                                  bug.status === 'in_progress' ? 'bg-info' :
                                  bug.status === 'fixed' ? 'bg-success' :
                                  'bg-muted-foreground'
                                }`}></span>
                                {bug.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 ml-14">
                          {bug.description}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={() => handleBugClick(bug)}
                        className="gap-2 shadow-md"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      {bug.projects && (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-background rounded">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium">{bug.projects.name}</span>
                        </div>
                      )}
                      <div className="ml-auto">
                        {format(new Date(bug.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </CardContent>
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
                <h3 className="text-xl font-semibold mb-2">No suggestions</h3>
                <p className="text-muted-foreground text-center">
                  You haven't submitted any suggestions yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {userSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-border/60 hover:border-warning/30 transition-all hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl font-bold">{suggestion.title}</CardTitle>
                          <Badge variant={suggestion.impact === 'high' ? 'destructive' : 'secondary'}>
                            {suggestion.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {suggestion.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          suggestion.status === 'new' ? 'bg-primary' :
                          suggestion.status === 'consider' ? 'bg-warning' :
                          suggestion.status === 'planned' ? 'bg-info' :
                          suggestion.status === 'done' ? 'bg-success' :
                          suggestion.status === 'rejected' ? 'bg-destructive' :
                          'bg-muted-foreground'
                        }`}></span>
                        <span className="font-medium capitalize">{suggestion.status.replace('_', ' ')}</span>
                      </div>
                      {suggestion.projects && (
                        <div className="text-muted-foreground">
                          Project: {suggestion.projects.name}
                        </div>
                      )}
                      <div className="text-muted-foreground ml-auto">
                        {format(new Date(suggestion.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </CardContent>
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
