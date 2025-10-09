import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TestTube, Bug, Lightbulb, Clock, TrendingUp, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Users } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';
import { subDays, format } from 'date-fns';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [stats, setStats] = useState({
    totalTests: 0,
    activeTests: 0,
    openBugs: 0,
    criticalBugs: 0,
    pendingSuggestions: 0,
    myAssignments: 0
  });

  const [chartData, setChartData] = useState<{
    bugsByStatus: any[];
    testsByPriority: any[];
    activityTrend: any[];
    suggestionsByImpact: any[];
  }>({
    bugsByStatus: [],
    testsByPriority: [],
    activityTrend: [],
    suggestionsByImpact: [],
  });

  useEffect(() => {
    if (user && currentOrg) {
      fetchDashboardStats();
      fetchChartData();
    }
  }, [user, currentOrg]);

  const fetchDashboardStats = async () => {
    if (!currentOrg) return;

    // Fetch various statistics
    const [
      { count: totalTests },
      { count: activeTests },
      { count: openBugs },
      { count: criticalBugs },
      { count: pendingSuggestions },
      { count: myAssignments }
    ] = await Promise.all([
      supabase.from('tests').select('*', { count: 'exact' }).eq('org_id', currentOrg.id).is('deleted_at', null),
      supabase.from('tests').select('*', { count: 'exact' }).eq('org_id', currentOrg.id).eq('status', 'active').is('deleted_at', null),
      supabase.from('bug_reports').select('*', { count: 'exact' }).eq('org_id', currentOrg.id).neq('status', 'closed').is('deleted_at', null),
      supabase.from('bug_reports').select('*', { count: 'exact' }).eq('org_id', currentOrg.id).eq('severity', 'critical').neq('status', 'closed').is('deleted_at', null),
      supabase.from('suggestions').select('*', { count: 'exact' }).eq('org_id', currentOrg.id).eq('status', 'new').is('deleted_at', null),
      supabase.from('test_assignments').select('*', { count: 'exact' }).eq('org_id', currentOrg.id).eq('assignee_id', user?.id).neq('state', 'done').is('deleted_at', null)
    ]);

    setStats({
      totalTests: totalTests || 0,
      activeTests: activeTests || 0,
      openBugs: openBugs || 0,
      criticalBugs: criticalBugs || 0,
      pendingSuggestions: pendingSuggestions || 0,
      myAssignments: myAssignments || 0
    });
  };

  const fetchChartData = async () => {
    if (!currentOrg) return;

    try {
      const { data: bugs } = await supabase
        .from('bug_reports')
        .select('status')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null);

      const bugsByStatus = bugs?.reduce((acc: any, bug) => {
        const status = bug.status || 'unknown';
        const existing = acc.find((item: any) => item.name === status);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({ name: status, value: 1 });
        }
        return acc;
      }, []) || [];

      const { data: tests } = await supabase
        .from('tests')
        .select('priority')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null);

      const testsByPriority = tests?.reduce((acc: any, test) => {
        const priority = test.priority === 0 ? 'Low' : test.priority === 1 ? 'Medium' : test.priority === 2 ? 'High' : 'Critical';
        const existing = acc.find((item: any) => item.name === priority);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({ name: priority, value: 1 });
        }
        return acc;
      }, []) || [];

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          name: format(date, 'MMM dd'),
          bugs: 0,
          tests: 0,
          suggestions: 0,
        };
      });

      const { data: recentBugs } = await supabase
        .from('bug_reports')
        .select('created_at')
        .eq('org_id', currentOrg.id)
        .gte('created_at', subDays(new Date(), 7).toISOString())
        .is('deleted_at', null);

      recentBugs?.forEach((bug) => {
        const day = format(new Date(bug.created_at), 'MMM dd');
        const dayData = last7Days.find((d) => d.name === day);
        if (dayData) dayData.bugs += 1;
      });

      const { data: suggestions } = await supabase
        .from('suggestions')
        .select('impact')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null);

      const suggestionsByImpact = suggestions?.reduce((acc: any, suggestion) => {
        const impact = suggestion.impact || 'unknown';
        const existing = acc.find((item: any) => item.name === impact);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({ name: impact, value: 1 });
        }
        return acc;
      }, []) || [];

      setChartData({
        bugsByStatus,
        testsByPriority,
        activityTrend: last7Days,
        suggestionsByImpact,
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  if (!currentOrg) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
          <p className="text-muted-foreground">
            Please select an organization to view your dashboard
          </p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
            <p className="text-muted-foreground">
              Please select an organization from the header to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{t('dashboard')}</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Overview of {currentOrg.name} test system activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Tests"
          value={stats.totalTests}
          icon={TestTube}
          iconColor="text-blue-600"
          description="All test cases"
        />
        <StatsCard
          title="Open Bugs"
          value={stats.openBugs}
          icon={Bug}
          iconColor="text-red-600"
          description="Requires attention"
        />
        <StatsCard
          title="Pending Ideas"
          value={stats.pendingSuggestions}
          icon={Lightbulb}
          iconColor="text-yellow-600"
          description="New suggestions"
        />
        <StatsCard
          title="My Assignments"
          value={stats.myAssignments}
          icon={Clock}
          iconColor="text-green-600"
          description="Tests assigned to you"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Bug Status Distribution"
          type="pie"
          data={chartData.bugsByStatus}
          dataKey="value"
        />
        <AnalyticsChart
          title="Tests by Priority"
          type="bar"
          data={chartData.testsByPriority}
          dataKey="value"
          xAxisKey="name"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnalyticsChart
          title="Activity Trend (Last 7 Days)"
          type="line"
          data={chartData.activityTrend}
          dataKey="bugs"
          xAxisKey="name"
          height={250}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/60 hover:border-success/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <CheckCircle className="h-4 w-4 text-success" />
              Active Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.activeTests}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Ready for execution
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-destructive/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical Bugs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.criticalBugs}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-primary/30 transition-all hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-primary" />
              Activity Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">
              {stats.totalTests + stats.openBugs + stats.pendingSuggestions}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total tracked items
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}