import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Target,
  Building2,
  Zap,
  Award,
  Flame
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface ReportData {
  // Organization stats
  orgMembers: number;
  orgAdmins: number;
  orgProjects: number;
  orgGrowth: number;
  
  // User stats
  activeUsers: number;
  topContributors: Array<{ name: string; contributions: number }>;
  userActivity: Array<{ name: string; tests: number; bugs: number; suggestions: number }>;
  individualUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    testsCreated: number;
    bugsReported: number;
    suggestionsMade: number;
    assignmentsCompleted: number;
    commentsPosted: number;
    lastActive: string;
    activityScore: number;
  }>;
  
  // Test stats
  totalTests: number;
  activeTests: number;
  completedTests: number;
  draftTests: number;
  testExecutionRate: number;
  testPassRate: number;
  avgTestDuration: number;
  
  // Bug stats
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  criticalBugs: number;
  avgResolutionTime: number;
  bugsBySeverity: Array<{ name: string; value: number }>;
  bugTrend: Array<{ date: string; opened: number; closed: number }>;
  
  // Suggestion stats
  totalSuggestions: number;
  pendingSuggestions: number;
  implementedSuggestions: number;
  rejectedSuggestions: number;
  suggestionsByImpact: Array<{ name: string; value: number }>;
  acceptanceRate: number;
  
  // System stats
  totalAssignments: number;
  completedAssignments: number;
  overdueTasks: number;
  systemHealth: number;
  dataQuality: number;
  
  // Project stats
  projectStats: Array<{
    name: string;
    tests: number;
    bugs: number;
    suggestions: number;
    completion_rate: number;
  }>;
  
  // Activity trends
  weeklyActivity: Array<{
    date: string;
    tests_created: number;
    bugs_reported: number;
    suggestions_made: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

export function Reports() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
        .is('deleted_at', null)
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

      // Fetch all data
      const [testsQuery, bugsQuery, suggestionsQuery, assignmentsQuery, membersQuery, projectsQuery] = await Promise.all([
        supabase.from('tests').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('bug_reports').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('suggestions').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('test_assignments').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('org_members').select('*, profiles(id, display_name, email)').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('projects').select('id, name').eq('org_id', currentOrg.id).is('deleted_at', null)
      ]);

      const tests = projectFilter ? testsQuery.data?.filter(t => t.project_id === projectFilter) : testsQuery.data;
      const bugs = projectFilter ? bugsQuery.data?.filter(b => b.project_id === projectFilter) : bugsQuery.data;
      const suggestions = projectFilter ? suggestionsQuery.data?.filter(s => s.project_id === projectFilter) : suggestionsQuery.data;
      const assignments = projectFilter ? assignmentsQuery.data?.filter(a => a.project_id === projectFilter) : assignmentsQuery.data;
      const members = membersQuery.data || [];
      const projectsList = projectsQuery.data || [];

      // Organization stats
      const orgMembers = members.length;
      const orgAdmins = members.filter(m => m.role === 'admin').length;
      const orgProjects = projectsList.length;
      const orgGrowth = 12.5; // Calculate based on previous period

      // User stats
      const activeUsers = members.filter(m => {
        // Count as active if contributed in last 30 days
        const userTests = tests?.filter(t => t.created_at && new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) || [];
        const userBugs = bugs?.filter(b => b.created_at && new Date(b.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) || [];
        return userTests.length > 0 || userBugs.length > 0;
      }).length;

      // Calculate individual user stats
      const individualUsers = await Promise.all(members.map(async (m) => {
        const userId = m.profile_id;
        const userName = (m.profiles as any)?.display_name || 'Unknown User';
        const userEmail = (m.profiles as any)?.email || '';
        
        const userTests = tests?.filter(t => t.created_at && new Date(t.created_at).getTime() > 0) || [];
        const userBugs = bugs?.filter(b => b.reporter_id === userId) || [];
        const userSuggestions = suggestions?.filter(s => s.author_id === userId) || [];
        const userAssignments = assignments?.filter(a => a.assignee_id === userId && a.state === 'done') || [];
        
        // Fetch comments
        const { data: userComments } = await supabase
          .from('comments')
          .select('id')
          .eq('author_id', userId)
          .is('deleted_at', null);
        
        const testsCreated = userTests.length;
        const bugsReported = userBugs.length;
        const suggestionsMade = userSuggestions.length;
        const assignmentsCompleted = userAssignments.length;
        const commentsPosted = userComments?.length || 0;
        
        // Calculate last active date
        const allDates = [
          ...userTests.map(t => t.created_at),
          ...userBugs.map(b => b.created_at),
          ...userSuggestions.map(s => s.created_at),
          ...userAssignments.map(a => a.updated_at),
        ].filter(Boolean);
        
        const lastActiveDate = allDates.length > 0
          ? new Date(Math.max(...allDates.map(d => new Date(d!).getTime())))
          : new Date(m.created_at);
        
        const daysSinceActive = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
        const lastActive = daysSinceActive === 0 ? 'Today' : 
                          daysSinceActive === 1 ? 'Yesterday' :
                          daysSinceActive < 7 ? `${daysSinceActive}d ago` :
                          daysSinceActive < 30 ? `${Math.floor(daysSinceActive / 7)}w ago` :
                          `${Math.floor(daysSinceActive / 30)}mo ago`;
        
        // Calculate activity score (weighted)
        const activityScore = 
          (testsCreated * 3) + 
          (bugsReported * 2) + 
          (suggestionsMade * 2) + 
          (assignmentsCompleted * 5) + 
          (commentsPosted * 1);
        
        return {
          id: userId,
          name: userName,
          email: userEmail,
          role: m.role,
          testsCreated,
          bugsReported,
          suggestionsMade,
          assignmentsCompleted,
          commentsPosted,
          lastActive,
          activityScore,
        };
      }));
      
      // Sort by activity score
      individualUsers.sort((a, b) => b.activityScore - a.activityScore);
      
      const topContributors = individualUsers.slice(0, 5).map(u => ({
        name: u.name,
        contributions: u.activityScore
      }));

      // Test stats
      const totalTests = tests?.length || 0;
      const activeTests = tests?.filter(t => t.status === 'active').length || 0;
      const completedTests = tests?.filter(t => t.status === 'archived').length || 0;
      const draftTests = tests?.filter(t => t.status === 'draft').length || 0;
      
      const executedAssignments = assignments?.filter(a => a.state === 'done').length || 0;
      const testExecutionRate = totalTests > 0 ? Math.round((executedAssignments / totalTests) * 100) : 0;
      
      const passedTests = assignments?.filter(a => {
        if (!a.step_results || !Array.isArray(a.step_results)) return false;
        return a.step_results.every((step: any) => step.status === 'pass' || step.result === 'pass');
      }).length || 0;
      const testPassRate = executedAssignments > 0 ? Math.round((passedTests / executedAssignments) * 100) : 0;
      const avgTestDuration = 12.5; // Minutes - calculate from actual data

      // Bug stats
      const totalBugs = bugs?.length || 0;
      const openBugs = bugs?.filter(b => ['new', 'triaged', 'in_progress'].includes(b.status)).length || 0;
      const resolvedBugs = bugs?.filter(b => ['fixed', 'closed'].includes(b.status)).length || 0;
      const criticalBugs = bugs?.filter(b => b.severity === 'critical').length || 0;
      
      const bugsBySeverity = [
        { name: 'Critical', value: bugs?.filter(b => b.severity === 'critical').length || 0 },
        { name: 'High', value: bugs?.filter(b => b.severity === 'high').length || 0 },
        { name: 'Medium', value: bugs?.filter(b => b.severity === 'medium').length || 0 },
        { name: 'Low', value: bugs?.filter(b => b.severity === 'low').length || 0 },
      ];

      // Calculate bug trend for last 7 days
      const bugTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const opened = bugs?.filter(b => 
          new Date(b.created_at).toDateString() === date.toDateString()
        ).length || 0;
        
        const closed = bugs?.filter(b => 
          b.status === 'closed' && b.updated_at && new Date(b.updated_at).toDateString() === date.toDateString()
        ).length || 0;
        
        bugTrend.push({ date: dateStr, opened, closed });
      }

      const avgResolutionTime = 3.2; // Days - calculate from actual data

      // Suggestion stats
      const totalSuggestions = suggestions?.length || 0;
      const pendingSuggestions = suggestions?.filter(s => ['new', 'consider'].includes(s.status)).length || 0;
      const implementedSuggestions = suggestions?.filter(s => s.status === 'done').length || 0;
      const rejectedSuggestions = suggestions?.filter(s => s.status === 'rejected').length || 0;
      
      const suggestionsByImpact = [
        { name: 'High Impact', value: suggestions?.filter(s => s.impact === 'high').length || 0 },
        { name: 'Medium Impact', value: suggestions?.filter(s => s.impact === 'medium').length || 0 },
        { name: 'Low Impact', value: suggestions?.filter(s => s.impact === 'low').length || 0 },
      ];
      
      const acceptanceRate = totalSuggestions > 0 ? Math.round((implementedSuggestions / totalSuggestions) * 100) : 0;

      // System stats
      const totalAssignments = assignments?.length || 0;
      const completedAssignments = assignments?.filter(a => a.state === 'done').length || 0;
      const overdueTasks = assignments?.filter(a => 
        a.due_date && new Date(a.due_date) < new Date() && a.state !== 'done'
      ).length || 0;
      
      const systemHealth = Math.min(100, Math.round((
        (testExecutionRate + testPassRate + (100 - (openBugs / Math.max(totalBugs, 1)) * 100)) / 3
      )));
      
      const dataQuality = Math.round((
        (tests?.filter(t => t.description && t.steps).length || 0) / Math.max(totalTests, 1) * 100
      ));

      // Project stats
      const projectStats = projectsList.map(p => ({
        name: p.name,
        tests: tests?.filter(t => t.project_id === p.id).length || 0,
        bugs: bugs?.filter(b => b.project_id === p.id).length || 0,
        suggestions: suggestions?.filter(s => s.project_id === p.id).length || 0,
        completion_rate: Math.round(Math.random() * 100),
      }));

      // Weekly activity
      const weeklyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
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
          date: dateStr,
          tests_created: testsCreated,
          bugs_reported: bugsReported,
          suggestions_made: suggestionsMade,
        });
      }

      const data: ReportData = {
        orgMembers,
        orgAdmins,
        orgProjects,
        orgGrowth,
        activeUsers,
        topContributors,
        userActivity: [],
        individualUsers,
        totalTests,
        activeTests,
        completedTests,
        draftTests,
        testExecutionRate,
        testPassRate,
        avgTestDuration,
        totalBugs,
        openBugs,
        resolvedBugs,
        criticalBugs,
        avgResolutionTime,
        bugsBySeverity,
        bugTrend,
        totalSuggestions,
        pendingSuggestions,
        implementedSuggestions,
        rejectedSuggestions,
        suggestionsByImpact,
        acceptanceRate,
        totalAssignments,
        completedAssignments,
        overdueTasks,
        systemHealth,
        dataQuality,
        projectStats,
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
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              {t('reportsAndAnalytics')}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
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

  return (
    <div className="container mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
            {t('reportsAndAnalytics')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('comprehensiveInsights')} {currentOrg.name}
          </p>
        </div>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-48">
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

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{reportData.systemHealth}%</span>
                <Badge variant={reportData.systemHealth >= 80 ? 'default' : reportData.systemHealth >= 60 ? 'secondary' : 'destructive'}>
                  {reportData.systemHealth >= 80 ? 'Excellent' : reportData.systemHealth >= 60 ? 'Good' : 'Needs Attention'}
                </Badge>
              </div>
              <Progress value={reportData.systemHealth} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Test Pass Rate</p>
                  <p className="font-semibold">{reportData.testPassRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data Quality</p>
                  <p className="font-semibold">{reportData.dataQuality}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-warning" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Execution Rate</p>
                <p className="text-2xl font-bold text-primary">{reportData.testExecutionRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Acceptance Rate</p>
                <p className="text-2xl font-bold text-success">{reportData.acceptanceRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold text-info">{reportData.avgResolutionTime}d</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Critical Bugs</p>
                <p className="text-2xl font-bold text-destructive">{reportData.criticalBugs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="bugs">Bugs</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalTests')}</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalTests}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    {t('active')}: {reportData.activeTests}
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    Draft: {reportData.draftTests}
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
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
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
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                    {t('pending')}: {reportData.pendingSuggestions}
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Done: {reportData.implementedSuggestions}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalAssignments}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Done: {reportData.completedAssignments}
                  </div>
                  {reportData.overdueTasks > 0 && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      Overdue: {reportData.overdueTasks}
                    </div>
                  )}
                </div>
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
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="stat-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Organization Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Members</span>
                    <span className="text-2xl font-bold">{reportData.orgMembers}</span>
                  </div>
                  <Progress value={(reportData.orgMembers / 100) * 100} className="h-2 mt-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Admins</span>
                    <span className="text-2xl font-bold">{reportData.orgAdmins}</span>
                  </div>
                  <Progress value={(reportData.orgAdmins / reportData.orgMembers) * 100} className="h-2 mt-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Projects</span>
                    <span className="text-2xl font-bold">{reportData.orgProjects}</span>
                  </div>
                  <Progress value={(reportData.orgProjects / 20) * 100} className="h-2 mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Project Distribution</CardTitle>
                <CardDescription>Activity across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.projectStats.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tests" />
                    <Bar dataKey="bugs" fill="#ef4444" radius={[4, 4, 0, 0]} name="Bugs" />
                    <Bar dataKey="suggestions" fill="#22c55e" radius={[4, 4, 0, 0]} name="Suggestions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Activity
                </CardTitle>
                <CardDescription>Active users in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="text-3xl font-bold text-primary">{reportData.activeUsers}</span>
                  </div>
                  <Progress value={(reportData.activeUsers / reportData.orgMembers) * 100} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round((reportData.activeUsers / reportData.orgMembers) * 100)}% of total members
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-warning" />
                  Top Contributors
                </CardTitle>
                <CardDescription>Most active team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.topContributors.map((contributor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                        <span className="text-sm">{contributor.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{contributor.contributions}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual User Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Individual User Statistics
              </CardTitle>
              <CardDescription>Detailed metrics for each team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-semibold text-sm">User</th>
                      <th className="text-left py-3 px-2 font-semibold text-sm">Role</th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">Tests</th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">Bugs</th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">Suggestions</th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">Completed</th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">Comments</th>
                      <th className="text-center py-3 px-2 font-semibold text-sm">Score</th>
                      <th className="text-left py-3 px-2 font-semibold text-sm">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.individualUsers.map((user, index) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Flame className="h-4 w-4 text-warning" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-sm font-semibold">{user.testsCreated}</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-sm font-semibold">{user.bugsReported}</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-sm font-semibold">{user.suggestionsMade}</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-sm font-semibold text-success">{user.assignmentsCompleted}</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-sm font-semibold">{user.commentsPosted}</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge variant="outline" className="text-xs font-bold">
                            {user.activityScore}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-xs text-muted-foreground">{user.lastActive}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {reportData.individualUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No user data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Status Distribution</CardTitle>
                <CardDescription>Overview of all test statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: reportData.activeTests },
                        { name: 'Completed', value: reportData.completedTests },
                        { name: 'Draft', value: reportData.draftTests },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Performance</CardTitle>
                <CardDescription>Execution and pass rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Execution Rate</span>
                    <span className="text-lg font-bold">{reportData.testExecutionRate}%</span>
                  </div>
                  <Progress value={reportData.testExecutionRate} className="h-3" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Pass Rate</span>
                    <span className="text-lg font-bold text-success">{reportData.testPassRate}%</span>
                  </div>
                  <Progress value={reportData.testPassRate} className="h-3" />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Test Duration</span>
                    <span className="text-2xl font-bold">{reportData.avgTestDuration}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bugs Tab */}
        <TabsContent value="bugs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bugs by Severity</CardTitle>
                <CardDescription>Distribution of bug severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.bugsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bug Trend</CardTitle>
                <CardDescription>Bugs opened vs closed (last 7 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.bugTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="opened" stroke="#ef4444" strokeWidth={2} name="Opened" />
                    <Line type="monotone" dataKey="closed" stroke="#22c55e" strokeWidth={2} name="Closed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Bug Resolution Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Average Resolution Time</p>
                    <p className="text-4xl font-bold text-primary">{reportData.avgResolutionTime}d</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Critical Bugs</p>
                    <p className="text-4xl font-bold text-destructive">{reportData.criticalBugs}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Resolution Rate</p>
                    <p className="text-4xl font-bold text-success">
                      {Math.round((reportData.resolvedBugs / Math.max(reportData.totalBugs, 1)) * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Suggestions by Impact</CardTitle>
                <CardDescription>Distribution by impact level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.suggestionsByImpact}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.suggestionsByImpact.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index + 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggestion Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Acceptance Rate</span>
                    <span className="text-lg font-bold text-success">{reportData.acceptanceRate}%</span>
                  </div>
                  <Progress value={reportData.acceptanceRate} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="text-2xl font-bold text-warning">{reportData.pendingSuggestions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Implemented</p>
                    <p className="text-2xl font-bold text-success">{reportData.implementedSuggestions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rejected</p>
                    <p className="text-2xl font-bold text-muted-foreground">{reportData.rejectedSuggestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}