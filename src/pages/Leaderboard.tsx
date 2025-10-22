import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserStats {
  id: string;
  name: string;
  testExecutions: number;
  bugsReported: number;
  suggestionsMade: number;
  commentsPosted: number;
  lastActive: string;
  activityScore: number;
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const { currentOrg } = useOrganization();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      fetchLeaderboardData();
    }
  }, [currentOrg]);

  const fetchLeaderboardData = async () => {
    if (!currentOrg) return;

    setLoading(true);
    try {
      // Fetch organization members
      const { data: members, error: membersError } = await supabase
        .from('org_members')
        .select('*, profiles(id, display_name)')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null);

      if (membersError) throw membersError;

      // Fetch all tests, bugs, suggestions, assignments
      const [testsQuery, bugsQuery, suggestionsQuery, assignmentsQuery] = await Promise.all([
        supabase.from('tests').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('bug_reports').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('suggestions').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
        supabase.from('test_assignments').select('*').eq('org_id', currentOrg.id).is('deleted_at', null),
      ]);

      const tests = testsQuery.data;
      const bugs = bugsQuery.data;
      const suggestions = suggestionsQuery.data;
      const assignments = assignmentsQuery.data;

      // Calculate stats for each user
      const stats = await Promise.all(members.map(async (m) => {
        const userId = m.profile_id;
        const userName = (m.profiles as any)?.display_name || 'Unknown User';

        // Count test executions (assignments with step_results)
        const testExecutions = assignments?.filter(a => 
          a.assignee_id === userId && 
          a.step_results && 
          Array.isArray(a.step_results) && 
          a.step_results.length > 0
        ).length || 0;

        const bugsReported = bugs?.filter(b => b.reporter_id === userId).length || 0;
        const suggestionsMade = suggestions?.filter(s => s.author_id === userId).length || 0;

        // Fetch comments for this user in this org
        const { data: userComments } = await supabase
          .from('comments')
          .select('id, created_at')
          .eq('author_id', userId)
          .eq('org_id', currentOrg.id)
          .is('deleted_at', null);

        const commentsPosted = userComments?.length || 0;

        // Calculate last active date
        const allDates = [
          ...bugs?.filter(b => b.reporter_id === userId).map(b => b.created_at) || [],
          ...suggestions?.filter(s => s.author_id === userId).map(s => s.created_at) || [],
          ...assignments?.filter(a => a.assignee_id === userId && a.updated_at).map(a => a.updated_at) || [],
          ...userComments?.map(c => c.created_at) || []
        ].filter(Boolean);

        const lastActive = allDates.length > 0
          ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))).toLocaleDateString()
          : 'Never';

        // Calculate activity score
        const activityScore = 
          testExecutions * 3 + // Test executions are worth more
          bugsReported * 2 + 
          suggestionsMade * 2 + 
          commentsPosted;

        return {
          id: userId,
          name: userName,
          testExecutions,
          bugsReported,
          suggestionsMade,
          commentsPosted,
          lastActive,
          activityScore,
        };
      }));

      // Sort by activity score descending
      stats.sort((a, b) => b.activityScore - a.activityScore);
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500">🥇 1st</Badge>;
    if (index === 1) return <Badge className="bg-gray-400">🥈 2nd</Badge>;
    if (index === 2) return <Badge className="bg-amber-600">🥉 3rd</Badge>;
    return <Badge variant="outline">#{index + 1}</Badge>;
  };

  if (!currentOrg) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
              Leaderboard
            </h1>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
            <p className="text-muted-foreground mb-4">
              Please select an organization to view the leaderboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Team performance rankings for {currentOrg.name}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Team performance rankings for {currentOrg.name}
          </p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {userStats.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Second Place */}
          <Card className="stat-card md:mt-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Medal className="h-8 w-8 text-gray-400" />
                <Badge className="bg-gray-400">🥈 2nd</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-bold text-lg truncate">{userStats[1].name}</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="text-2xl font-bold">{userStats[1].activityScore}</span>
              </div>
            </CardContent>
          </Card>

          {/* First Place */}
          <Card className="stat-card border-2 border-yellow-500 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Trophy className="h-10 w-10 text-yellow-500" />
                <Badge className="bg-yellow-500">🥇 1st</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-bold text-xl truncate">{userStats[0].name}</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="text-3xl font-bold text-yellow-500">{userStats[0].activityScore}</span>
              </div>
            </CardContent>
          </Card>

          {/* Third Place */}
          <Card className="stat-card md:mt-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Award className="h-8 w-8 text-amber-600" />
                <Badge className="bg-amber-600">🥉 3rd</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-bold text-lg truncate">{userStats[2].name}</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="text-2xl font-bold">{userStats[2].activityScore}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Individual User Statistics
          </CardTitle>
          <CardDescription>Detailed performance metrics for all team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-2 font-semibold text-sm">Rank</th>
                  <th className="text-left py-3 px-2 font-semibold text-sm">User</th>
                  <th className="text-center py-3 px-2 font-semibold text-sm">Executions</th>
                  <th className="text-center py-3 px-2 font-semibold text-sm">Bugs</th>
                  <th className="text-center py-3 px-2 font-semibold text-sm">Suggestions</th>
                  <th className="text-center py-3 px-2 font-semibold text-sm">Comments</th>
                  <th className="text-center py-3 px-2 font-semibold text-sm">Score</th>
                  <th className="text-left py-3 px-2 font-semibold text-sm">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((user, index) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        {getRankBadge(index)}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <p className="font-semibold">{user.name}</p>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="font-mono">
                        {user.testExecutions}
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="font-mono">
                        {user.bugsReported}
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="font-mono">
                        {user.suggestionsMade}
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="font-mono">
                        {user.commentsPosted}
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="font-bold text-lg">{user.activityScore}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm text-muted-foreground">{user.lastActive}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {userStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No user data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
