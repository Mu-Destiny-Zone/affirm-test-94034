import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ReportData {
  totalTests: number;
  activeTests: number;
  completedTests: number;
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  totalSuggestions: number;
  pendingSuggestions: number;
  implementedSuggestions: number;
  totalAssignments: number;
  completedAssignments: number;
  overdueTasks: number;
  projectStats: Array<{
    name: string;
    tests: number;
    bugs: number;
    suggestions: number;
    completion_rate: number;
  }>;
  weeklyActivity: Array<{
    date: string;
    tests_created: number;
    bugs_reported: number;
    suggestions_made: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentOrg) {
      fetchReportData();
      fetchProjects();
    }
  }, [user, currentOrg, selectedProject]);

  const fetchProjects = async () => {
    if (!currentOrg) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('org_id', currentOrg.id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchReportData = async () => {
    if (!currentOrg) {
      setReportData(null);
      setLoading(false);
      return;
    }

    try {
      const projectFilter = selectedProject !== 'all' ? selectedProject : undefined;

      // Fetch tests data
      const testsQuery = supabase.from('tests').select('*').eq('org_id', currentOrg.id);
      if (projectFilter) testsQuery.eq('project_id', projectFilter);
      const { data: tests } = await testsQuery;

      // Fetch bugs data
      const bugsQuery = supabase.from('bug_reports').select('*').eq('org_id', currentOrg.id);
      if (projectFilter) bugsQuery.eq('project_id', projectFilter);
      const { data: bugs } = await bugsQuery;

      // Fetch suggestions data
      const suggestionsQuery = supabase.from('suggestions').select('*').eq('org_id', currentOrg.id);
      if (projectFilter) suggestionsQuery.eq('project_id', projectFilter);
      const { data: suggestions } = await suggestionsQuery;

      // Fetch assignments data
      const assignmentsQuery = supabase.from('test_assignments').select('*').eq('org_id', currentOrg.id);
      if (projectFilter) assignmentsQuery.eq('project_id', projectFilter);
      const { data: assignments } = await assignmentsQuery;

      // Calculate project stats
      const { data: projectStats } = await supabase
        .from('projects')
        .select(`
          id, name,
          tests:tests(count),
          bugs:bug_reports(count),
          suggestions:suggestions(count)
        `)
        .eq('org_id', currentOrg.id);

      // Calculate weekly activity (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weeklyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const testsCreated = tests?.filter(t => 
          new Date(t.created_at).toDateString() === date.toDateString()
        ).length || 0;
        
        const bugsReported = bugs?.filter(b => 
          new Date(b.created_at).toDateString() === date.toDateString()
        ).length || 0;
        
        const suggestionsMade = suggestions?.filter(s => 
          new Date(s.created_at).toDateString() === date.toDateString()
        ).length || 0;
        
        weeklyActivity.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          tests_created: testsCreated,
          bugs_reported: bugsReported,
          suggestions_made: suggestionsMade,
        });
      }

      const data: ReportData = {
        totalTests: tests?.length || 0,
        activeTests: tests?.filter(t => t.status === 'active').length || 0,
        completedTests: tests?.filter(t => t.status === 'archived').length || 0,
        totalBugs: bugs?.length || 0,
        openBugs: bugs?.filter(b => ['new', 'assigned', 'in_progress'].includes(b.status)).length || 0,
        resolvedBugs: bugs?.filter(b => ['resolved', 'closed'].includes(b.status)).length || 0,
        totalSuggestions: suggestions?.length || 0,
        pendingSuggestions: suggestions?.filter(s => ['new', 'consider'].includes(s.status)).length || 0,
        implementedSuggestions: suggestions?.filter(s => s.status === 'done').length || 0,
        totalAssignments: assignments?.length || 0,
        completedAssignments: assignments?.filter(a => a.state === 'done').length || 0,
        overdueTasks: assignments?.filter(a => 
          a.due_date && new Date(a.due_date) < new Date() && a.state !== 'done'
        ).length || 0,
        projectStats: projectStats?.map(p => ({
          name: p.name,
          tests: p.tests?.[0]?.count || 0,
          bugs: p.bugs?.[0]?.count || 0,
          suggestions: p.suggestions?.[0]?.count || 0,
          completion_rate: Math.round(Math.random() * 100), // Placeholder calculation
        })) || [],
        weeklyActivity,
      };

      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !reportData || !currentOrg) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              {t('reportsAndAnalytics')}
            </h1>
            <p className="text-muted-foreground">
              {!currentOrg ? t('selectOrgMsg') : t('comprehensiveInsights')}
            </p>
          </div>
        </div>

        {!currentOrg ? (
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('noOrgSelected')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('selectOrgMsg')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    );
  }

  const testStatusData = [
    { name: 'Active', value: reportData.activeTests, color: COLORS[0] },
    { name: 'Completed', value: reportData.completedTests, color: COLORS[1] },
    { name: 'Draft', value: reportData.totalTests - reportData.activeTests - reportData.completedTests, color: COLORS[2] },
  ];

  const bugStatusData = [
    { name: 'Open', value: reportData.openBugs, color: COLORS[3] },
    { name: 'Resolved', value: reportData.resolvedBugs, color: COLORS[4] },
  ];

  const suggestionStatusData = [
    { name: 'Pending', value: reportData.pendingSuggestions, color: COLORS[0] },
    { name: 'Implemented', value: reportData.implementedSuggestions, color: COLORS[1] },
    { name: 'Other', value: reportData.totalSuggestions - reportData.pendingSuggestions - reportData.implementedSuggestions, color: COLORS[2] },
  ];

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            {t('reportsAndAnalytics')}
          </h1>
          <p className="text-muted-foreground">
            {t('comprehensiveInsights')} {currentOrg.name}
          </p>
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allProjects')}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalTests')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalTests}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {t('active')}: {reportData.activeTests}
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                {t('draft')}: {reportData.totalTests - reportData.activeTests - reportData.completedTests}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('bugReports')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalBugs}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                {t('open')}: {reportData.openBugs}
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {t('resolved')}: {reportData.resolvedBugs}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('suggestions')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalSuggestions}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                {t('pending')}: {reportData.pendingSuggestions}
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {t('done')}: {reportData.implementedSuggestions}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('testAssignments')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalAssignments}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {t('completed')}: {reportData.completedAssignments}
              </div>
              {reportData.overdueTasks > 0 && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                  {t('overdue')}: {reportData.overdueTasks}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('testStatusDistribution')}</CardTitle>
            <CardDescription>{t('overviewTestStatuses')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={testStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {testStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('bugStatusOverview')}</CardTitle>
            <CardDescription>{t('currentStatusBugs')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bugStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Weekly Activity Trend
          </CardTitle>
          <CardDescription>Activity over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={reportData.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="tests_created" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Tests Created"
              />
              <Line 
                type="monotone" 
                dataKey="bugs_reported" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Bugs Reported"
              />
              <Line 
                type="monotone" 
                dataKey="suggestions_made" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Suggestions Made"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Project Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Statistics across all projects in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={reportData.projectStats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tests" fill="hsl(var(--primary))" name="Tests" />
              <Bar dataKey="bugs" fill="#ef4444" name="Bugs" />
              <Bar dataKey="suggestions" fill="#22c55e" name="Suggestions" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Completion Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Completion & Performance Metrics</CardTitle>
          <CardDescription>Key performance indicators for your testing process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Test Completion Rate</span>
                <span className="text-sm text-muted-foreground">
                  {reportData.totalAssignments > 0 
                    ? Math.round((reportData.completedAssignments / reportData.totalAssignments) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={reportData.totalAssignments > 0 
                  ? (reportData.completedAssignments / reportData.totalAssignments) * 100
                  : 0
                } 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bug Resolution Rate</span>
                <span className="text-sm text-muted-foreground">
                  {reportData.totalBugs > 0 
                    ? Math.round((reportData.resolvedBugs / reportData.totalBugs) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={reportData.totalBugs > 0 
                  ? (reportData.resolvedBugs / reportData.totalBugs) * 100
                  : 0
                } 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Suggestion Implementation</span>
                <span className="text-sm text-muted-foreground">
                  {reportData.totalSuggestions > 0 
                    ? Math.round((reportData.implementedSuggestions / reportData.totalSuggestions) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={reportData.totalSuggestions > 0 
                  ? (reportData.implementedSuggestions / reportData.totalSuggestions) * 100
                  : 0
                } 
                className="h-2"
              />
            </div>
          </div>

          {/* Key Insights */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Key Insights
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {reportData.overdueTasks > 0 && (
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  {reportData.overdueTasks} overdue task{reportData.overdueTasks > 1 ? 's' : ''} need attention
                </li>
              )}
              {reportData.openBugs > reportData.resolvedBugs && (
                <li className="flex items-center gap-2">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  More open bugs ({reportData.openBugs}) than resolved ({reportData.resolvedBugs})
                </li>
              )}
              {reportData.activeTests > 0 && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {reportData.activeTests} active test{reportData.activeTests > 1 ? 's' : ''} ready for execution
                </li>
              )}
              {reportData.pendingSuggestions > 0 && (
                <li className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-blue-500" />
                  {reportData.pendingSuggestions} suggestion{reportData.pendingSuggestions > 1 ? 's' : ''} awaiting review
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}