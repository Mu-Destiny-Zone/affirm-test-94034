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
import { TestTube, Bug, Lightbulb, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

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
  severity: string;
  status: string;
  created_at: string;
  projects: {
    name: string;
  } | null;
}

interface UserSuggestion {
  id: string;
  title: string;
  description: string;
  impact: string;
  status: string;
  created_at: string;
  projects: {
    name: string;
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
            projects (name)
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground text-lg mt-2">
          View and manage your assigned tests, bugs, and suggestions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/60 hover:border-primary/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Clock className="h-4 w-4 text-primary" />
              Assigned Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.pendingTests}</div>
            <p className="text-sm text-muted-foreground mt-2">Awaiting execution</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-info/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <TestTube className="h-4 w-4 text-info" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.inProgressTests}</div>
            <p className="text-sm text-muted-foreground mt-2">Currently testing</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-destructive/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Bug className="h-4 w-4 text-destructive" />
              Open Bugs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.openBugs}</div>
            <p className="text-sm text-muted-foreground mt-2">Bugs you reported</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-warning/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Lightbulb className="h-4 w-4 text-warning" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.pendingSuggestions}</div>
            <p className="text-sm text-muted-foreground mt-2">Pending review</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="tests" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TestTube className="h-4 w-4 mr-2" />
            Assigned Tests ({assignedTests.length})
          </TabsTrigger>
          <TabsTrigger value="bugs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Bug className="h-4 w-4 mr-2" />
            My Bugs ({userBugs.length})
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Lightbulb className="h-4 w-4 mr-2" />
            My Suggestions ({userSuggestions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {assignedTests.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TestTube className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No assigned tests</h3>
                <p className="text-muted-foreground text-center">
                  You don't have any tests assigned to you at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignedTests.map((assignment) => (
                <Card key={assignment.id} className="border-border/60 hover:border-primary/30 transition-all hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl font-bold">{assignment.tests.title}</CardTitle>
                          <Badge variant={getPriorityColor(assignment.tests.priority)}>
                            {getPriorityLabel(assignment.tests.priority)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {assignment.tests.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate('/tests')}
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
                        {assignment.state === 'assigned' && (
                          <>
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-medium">Assigned</span>
                          </>
                        )}
                        {assignment.state === 'in_progress' && (
                          <>
                            <TestTube className="h-4 w-4 text-info" />
                            <span className="font-medium">In Progress</span>
                          </>
                        )}
                        {assignment.state === 'blocked' && (
                          <>
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <span className="font-medium">Blocked</span>
                          </>
                        )}
                        {assignment.state === 'done' && (
                          <>
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="font-medium">Completed</span>
                          </>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {assignment.tests.steps?.length || 0} steps
                      </div>
                      {assignment.due_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          Due: {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bugs" className="space-y-4">
          {userBugs.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bug className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No bugs reported</h3>
                <p className="text-muted-foreground text-center">
                  You haven't reported any bugs yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {userBugs.map((bug) => (
                <Card key={bug.id} className="border-border/60 hover:border-destructive/30 transition-all hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl font-bold">{bug.title}</CardTitle>
                          <Badge variant={getSeverityColor(bug.severity)}>
                            {bug.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {bug.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate('/bugs')}
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
                          bug.status === 'new' ? 'bg-primary' :
                          bug.status === 'triaged' ? 'bg-warning' :
                          bug.status === 'in_progress' ? 'bg-info' :
                          bug.status === 'fixed' ? 'bg-success' :
                          bug.status === 'closed' ? 'bg-muted-foreground' :
                          'bg-destructive'
                        }`}></span>
                        <span className="font-medium capitalize">{bug.status.replace('_', ' ')}</span>
                      </div>
                      {bug.projects && (
                        <div className="text-muted-foreground">
                          Project: {bug.projects.name}
                        </div>
                      )}
                      <div className="text-muted-foreground ml-auto">
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
                        onClick={() => navigate('/suggestions')}
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
    </div>
  );
}
