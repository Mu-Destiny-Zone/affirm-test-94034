import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Test } from '@/lib/types';
import { Plus, Search, Filter, TestTube, Users, TrendingUp, UserPlus, ClipboardList, CheckCircle, XCircle, MinusCircle, Clock, User, Calendar, FileText } from 'lucide-react';
import { CreateTestDialog } from '@/components/tests/CreateTestDialog';
import { TestCard } from '@/components/tests/TestCard';
import { TestDetailDialog } from '@/components/tests/TestDetailDialog';
import { TestExecutionDialog } from '@/components/tests/TestExecutionDialog';
import { TestExecutionResultDialog } from '@/components/tests/TestExecutionResultDialog';
import { EditTestDialog } from '@/components/tests/EditTestDialog';
import { TestAssignmentDialog } from '@/components/tests/TestAssignmentDialog';
import { CopyTestDialog } from '@/components/tests/CopyTestDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export function Tests() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentOrgId, setCurrentOrgId] = useState<string>('');
  
  // Get user role for the current org
  const { canManage, loading: roleLoading, isAdmin, isManager, orgRole } = useUserRole(currentOrg?.id);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogTest, setDetailDialogTest] = useState<Test | null>(null);
  const [executionDialogTest, setExecutionDialogTest] = useState<Test | null>(null);
  const [executionResultDialogOpen, setExecutionResultDialogOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);
  const [selectedExecutionTest, setSelectedExecutionTest] = useState<any | null>(null);
  const [editDialogTest, setEditDialogTest] = useState<Test | null>(null);
  const [assignmentDialogTest, setAssignmentDialogTest] = useState<Test | null>(null);
  const [deleteDialogTest, setDeleteDialogTest] = useState<Test | null>(null);
  const [copyDialogTest, setCopyDialogTest] = useState<Test | null>(null);
  
  // Results tab state
  const [activeTab, setActiveTab] = useState('tests');
  const [results, setResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'completed' | 'failed' | 'passed'>('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    archived: 0
  });

  useEffect(() => {
    if (user && currentOrg) {
      fetchData();
    }
  }, [user, currentOrg]);

  useEffect(() => {
    if (activeTab === 'results' && currentOrg?.id && !resultsLoading) {
      fetchResults();
    }
  }, [activeTab, currentOrg?.id]);

  const fetchData = async () => {
    if (!currentOrg) {
      setTests([]);
      setLoading(false);
      return;
    }

    try {
      // First, get user's org role to determine access level
      let userCanManage = false;
      
      if (user) {
        // Check if user has admin or manager role in current org
        const { data: orgRole } = await supabase.rpc('org_role', { org_id: currentOrg.id });
        userCanManage = orgRole === 'admin' || orgRole === 'manager';
      }

      let testsQuery = supabase
        .from('tests')
        .select('*')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // For non-admin users, only show tests assigned to them
      if (!userCanManage && user) {
        const { data: assignmentsData } = await supabase
          .from('test_assignments')
          .select('test_id')
          .eq('assignee_id', user.id)
          .is('deleted_at', null);

        const assignedTestIds = assignmentsData?.map(a => a.test_id) || [];
        
        if (assignedTestIds.length > 0) {
          testsQuery = testsQuery.in('id', assignedTestIds);
        } else {
          // No assigned tests, return empty array
          setTests([]);
          setStats({ total: 0, active: 0, draft: 0, archived: 0 });
          setLoading(false);
          return;
        }
      }

      // Fetch test assignments with execution results for all tests
      let assignmentsQuery = supabase
        .from('test_assignments')
        .select(`
          id,
          test_id,
          assignee_id,
          due_date,
          state,
          step_results,
          created_at,
          updated_at,
          profiles:assignee_id (
            display_name,
            email
          )
        `)
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      // For non-managers, only show their own assignments
      if (!userCanManage && user) {
        assignmentsQuery = assignmentsQuery.eq('assignee_id', user.id);
      }

      const [testsResponse, assignmentsResponse] = await Promise.all([
        testsQuery,
        assignmentsQuery
      ]);

      if (testsResponse.error) {
        toast({
          title: 'Error',
          description: testsResponse.error.message,
          variant: 'destructive'
        });
      } else {
        const assignments = assignmentsResponse.data || [];
        const testsWithSteps = (testsResponse.data || []).map(test => {
          // Get execution results for this test
          const testAssignments = assignments.filter(a => a.test_id === test.id);
          const executionResults = testAssignments.filter(a => a.step_results && Array.isArray(a.step_results) && a.step_results.length > 0);
          
          // Calculate execution stats
          let totalExecutions = executionResults.length;
          let passedExecutions = 0;
          let failedExecutions = 0;
          let lastExecution = null;
          
          if (executionResults.length > 0) {
            executionResults.forEach(result => {
              const stepResults = Array.isArray(result.step_results) ? result.step_results : [];
              const hasFailures = stepResults.some((step: any) => {
                const v = (step?.status ?? step?.result);
                return v === 'fail' || v === 'failed';
              });
              const allPassed = stepResults.every((step: any) => {
                const v = (step?.status ?? step?.result);
                return v === 'pass' || v === 'passed';
              });
              
              if (hasFailures) failedExecutions++;
              else if (allPassed) passedExecutions++;
            });
            
            // Get most recent execution
            lastExecution = executionResults.sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0];
          }

          return {
            ...test,
            steps: Array.isArray(test.steps) ? test.steps.map(step => ({
              title: typeof step === 'object' && step !== null && 'title' in step ? (step as any).title || '' : '',
              expected: typeof step === 'object' && step !== null && 'expected' in step ? (step as any).expected || '' : '',
              required: typeof step === 'object' && step !== null && 'required' in step ? Boolean((step as any).required) : true
            })) : [],
            // Add execution data
            executionStats: {
              total: totalExecutions,
              passed: passedExecutions,
              failed: failedExecutions,
              passRate: totalExecutions > 0 ? Math.round((passedExecutions / totalExecutions) * 100) : 0
            },
            lastExecution,
            assignments: testAssignments
          };
        });
        
        setTests(testsWithSteps);
        
        // Calculate stats
        const total = testsWithSteps.length;
        const active = testsWithSteps.filter(t => t.status === 'active').length;
        const draft = testsWithSteps.filter(t => t.status === 'draft').length;
        const archived = testsWithSteps.filter(t => t.status === 'archived').length;
        setStats({ total, active, draft, archived });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!currentOrg?.id) return;

    setResultsLoading(true);
    try {
      const { data, error } = await supabase
        .from('test_assignments')
        .select(`
          id,
          test_id,
          assignee_id,
          due_date,
          state,
          notes,
          step_results,
          created_at,
          updated_at,
          tests!inner (
            id,
            title,
            description,
            steps
          ),
          profiles!test_assignments_assignee_id_fkey (
            id,
            display_name,
            email
          )
        `)
        .eq('org_id', currentOrg.id)
        .not('step_results', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const mappedResults = data?.map(item => ({
        ...item,
        assignee: item.profiles,
        step_results: Array.isArray(item.step_results) ? item.step_results : [],
        test: {
          ...item.tests,
          steps: Array.isArray(item.tests.steps) ? item.tests.steps : []
        }
      })) || [];

      setResults(mappedResults);
    } catch (error) {
      console.error('Error fetching test results:', error);
    } finally {
      setResultsLoading(false);
    }
  };

  const normalizeStep = (step: any) => {
    let v = (step?.status ?? step?.result) as string | undefined;
    if (!v) return undefined;
    if (v === 'passed') return 'pass';
    if (v === 'failed') return 'fail';
    if (v === 'skipped') return 'skip';
    return v;
  };

  const getOverallResult = (stepResults: any) => {
    const results = Array.isArray(stepResults) ? stepResults : [];
    if (!results || results.length === 0) return 'no-results';
    
    const hasFailures = results.some(step => normalizeStep(step) === 'fail');
    const hasSkipped = results.some(step => normalizeStep(step) === 'skip');
    const allPassed = results.every(step => normalizeStep(step) === 'pass');
    
    if (hasFailures) return 'failed';
    if (allPassed) return 'passed';
    if (hasSkipped) return 'partial';
    return 'in-progress';
  };

  const getResultStats = (stepResults: any) => {
    const results = Array.isArray(stepResults) ? stepResults : [];
    if (!results || results.length === 0) return { passed: 0, failed: 0, skipped: 0, total: 0 };
    
    return {
      passed: results.filter(step => normalizeStep(step) === 'pass').length,
      failed: results.filter(step => normalizeStep(step) === 'fail').length,
      skipped: results.filter(step => normalizeStep(step) === 'skip').length,
      total: results.length
    };
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Passed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><MinusCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="outline">No Results</Badge>;
    }
  };

  const filteredResults = results.filter(result => {
    if (resultsFilter === 'all') return true;
    const overallResult = getOverallResult(result.step_results);
    
    switch (resultsFilter) {
      case 'completed':
        return ['passed', 'failed', 'partial'].includes(overallResult);
      case 'passed':
        return overallResult === 'passed';
      case 'failed':
        return overallResult === 'failed';
      default:
        return true;
    }
  });

  const handleEditTest = (test: Test) => {
    setEditDialogTest(test);
  };

  const handleDeleteTest = async () => {
    if (!deleteDialogTest) return;

    try {
      const { error } = await (supabase as any)
        .rpc('soft_delete_test', { test_id: deleteDialogTest.id });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test deleted successfully'
      });

      setDeleteDialogTest(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleViewExecution = (execution: any, test: any) => {
    setSelectedExecution(execution);
    setSelectedExecutionTest(test);
    setExecutionResultDialogOpen(true);
  };

  // Filter tests based on search and filters
  const filteredTests = tests.filter(test => {
    const matchesSearch = !searchQuery || 
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || test.priority.toString() === priorityFilter;
    
    // Testers and viewers should not see draft or archived tests
    const matchesRole = canManage || (test.status !== 'draft' && test.status !== 'archived');
    
    return matchesSearch && matchesStatus && matchesPriority && matchesRole;
  });

  if (loading || !currentOrg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('tests')}</h1>
            <p className="text-muted-foreground">
              {!currentOrg ? 'Please select an organization to view tests' : 'Loading...'}
            </p>
          </div>
          
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        </div>

        {!currentOrg ? (
          <Card>
            <CardContent className="text-center py-12">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
              <p className="text-muted-foreground mb-4">
                Please select an organization from the header to view and manage tests.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse">Loading tests...</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-gradient-brand rounded-lg shadow-brand">
                <TestTube className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('tests')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {canManage 
                ? `Create and manage test cases for ${currentOrg.name}`
                : `View and execute tests assigned to you in ${currentOrg.name}`
              }
            </p>
          </div>
          
          {activeTab === 'tests' && canManage && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="btn-gradient shadow-lg w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="text-sm">New Test</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="0">Low</SelectItem>
              <SelectItem value="1">Medium</SelectItem>
              <SelectItem value="2">High</SelectItem>
              <SelectItem value="3">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {tests.length === 0 ? (
              <>
                <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first test case to get started with testing your projects.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </>
            ) : (
              <>
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or filters.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTests.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    onEdit={handleEditTest}
                    onDelete={(test) => setDeleteDialogTest(test)}
                    onExecute={(test) => setExecutionDialogTest(test)}
                    onViewDetails={(test) => setDetailDialogTest(test)}
                    onAssign={(test) => setAssignmentDialogTest(test)}
                    onCopy={(test) => setCopyDialogTest(test)}
                    onViewExecution={handleViewExecution}
                    canManage={canManage}
                    isAdmin={isAdmin}
                    isManager={isManager}
                  />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateTestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTestCreated={fetchData}
      />

      <EditTestDialog
        test={editDialogTest}
        open={!!editDialogTest}
        onOpenChange={(open) => !open && setEditDialogTest(null)}
        onTestUpdated={fetchData}
      />

      <TestAssignmentDialog
        test={assignmentDialogTest}
        open={!!assignmentDialogTest}
        onOpenChange={(open) => !open && setAssignmentDialogTest(null)}
        onAssignmentUpdated={fetchData}
      />

      <TestDetailDialog
        test={detailDialogTest}
        open={!!detailDialogTest}
        onOpenChange={(open) => !open && setDetailDialogTest(null)}
        onEdit={handleEditTest}
        onExecute={(test) => setExecutionDialogTest(test)}
        canManage={true}
      />

      <TestExecutionDialog
        test={executionDialogTest}
        open={!!executionDialogTest}
        onOpenChange={(open) => !open && setExecutionDialogTest(null)}
        onExecutionComplete={fetchData}
      />

      <CopyTestDialog
        test={copyDialogTest}
        open={!!copyDialogTest}
        onOpenChange={(open) => !open && setCopyDialogTest(null)}
        onTestCopied={fetchData}
      />

      <AlertDialog open={!!deleteDialogTest} onOpenChange={(open) => !open && setDeleteDialogTest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialogTest?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Test Execution Result Dialog */}
      <TestExecutionResultDialog
        execution={selectedExecution}
        test={selectedExecutionTest}
        open={executionResultDialogOpen}
        onOpenChange={setExecutionResultDialogOpen}
        onEditTest={(test) => {
          setExecutionResultDialogOpen(false);
          handleEditTest(test);
        }}
        onReassignTest={() => {
          setExecutionResultDialogOpen(false);
          fetchResults();
        }}
        canManage={canManage}
      />
    </div>
  );
}