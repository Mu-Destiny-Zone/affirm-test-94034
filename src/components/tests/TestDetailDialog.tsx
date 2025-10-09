import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Test } from '@/lib/types';
import { Clock, Play, XCircle, TestTube, CheckCircle2, AlertCircle, Users, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TestExecutionResultDialog } from '@/components/tests/TestExecutionResultDialog';
import { useAuth } from '@/hooks/useAuth';

interface TestDetailDialogProps {
  test: Test | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (test: Test) => void;
  onExecute: (test: Test) => void;
  canManage: boolean;
}

export function TestDetailDialog({ test, open, onOpenChange, onEdit, onExecute, canManage }: TestDetailDialogProps) {
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);
  const [executionResultDialogOpen, setExecutionResultDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (test && open) {
      fetchExecutionHistory();
    }
  }, [test, open]);

  const fetchExecutionHistory = async () => {
    if (!test) return;
    
    setLoadingHistory(true);
    try {
      let query = supabase
        .from('test_assignments')
        .select(`
          id,
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
        .eq('test_id', test.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter to only show assignments with execution results
      let executionResults = (data || []).filter(assignment => 
        assignment.step_results && 
        Array.isArray(assignment.step_results) && 
        assignment.step_results.length > 0
      );

      // If user is not admin/manager, only show their own executions
      if (!canManage && user) {
        executionResults = executionResults.filter(assignment => 
          assignment.assignee_id === user.id
        );
      }

      setExecutionHistory(executionResults);
    } catch (error) {
      console.error('Error fetching execution history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!test) return null;

  const handleViewExecution = (execution: any) => {
    setSelectedExecution(execution);
    setExecutionResultDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'active': return <Play className="h-4 w-4" />;
      case 'archived': return <XCircle className="h-4 w-4" />;
      default: return <TestTube className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 0: return 'Low';
      case 1: return 'Medium';
      case 2: return 'High';
      case 3: return 'Critical';
      default: return 'Low';
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

  const getExecutionResultBadge = (stepResults: any[]) => {
    if (!stepResults || stepResults.length === 0) return null;
    
    const normalize = (s: any) => {
      let v = (s?.status ?? s?.result);
      if (v === 'passed') v = 'pass';
      if (v === 'failed') v = 'fail';
      if (v === 'skipped') v = 'skip';
      return v;
    };
    
    const hasFailures = stepResults.some(step => normalize(step) === 'fail');
    const allPassed = stepResults.every(step => normalize(step) === 'pass');
    
    if (hasFailures) {
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    } else if (allPassed) {
      return <Badge variant="default" className="text-xs">Passed</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Partial</Badge>;
    }
  };

  const getExecutionStats = () => {
    if (executionHistory.length === 0) return null;
    
    const total = executionHistory.length;
    const passed = executionHistory.filter(exec => {
      const stepResults = exec.step_results || [];
      return stepResults.every((step: any) => {
        const v = (step?.status ?? step?.result);
        return v === 'pass' || v === 'passed';
      });
    }).length;
    const failed = executionHistory.filter(exec => {
      const stepResults = exec.step_results || [];
      return stepResults.some((step: any) => {
        const v = (step?.status ?? step?.result);
        return v === 'fail' || v === 'failed';
      });
    }).length;
    
    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">{test.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Test Details</TabsTrigger>
            <TabsTrigger value="history">
              <BarChart3 className="h-4 w-4 mr-2" />
              Execution History
              {executionHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {executionHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant={getStatusColor(test.status)} className="flex items-center gap-1">
                {getStatusIcon(test.status)}
                <span className="capitalize">{test.status}</span>
              </Badge>
              
              <Badge variant={getPriorityColor(test.priority)}>
                {getPriorityLabel(test.priority)} Priority
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TestTube className="h-4 w-4" />
                <span>{test.steps?.length || 0} steps</span>
              </div>
            </div>

            {/* Description */}
            {test.description && (
              <div className="space-y-2">
                <h3 className="font-semibold">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{test.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Created</h4>
                <p className="text-muted-foreground">{new Date(test.created_at).toLocaleString()}</p>
              </div>
              {test.updated_at !== test.created_at && (
                <div className="space-y-2">
                  <h4 className="font-medium">Last Updated</h4>
                  <p className="text-muted-foreground">{new Date(test.updated_at).toLocaleString()}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Test Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Test Steps</h3>
                <span className="text-sm text-muted-foreground">{test.steps?.length || 0} steps</span>
              </div>

              {test.steps && test.steps.length > 0 ? (
                <div className="space-y-3">
                  {test.steps.map((step, index) => (
                    <Card key={index} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                            {index + 1}
                          </span>
                          Step {index + 1}
                          {step.required && (
                            <Badge variant="outline" className="ml-auto">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Required
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div>
                          <h5 className="font-medium text-sm mb-1">Action</h5>
                          <p className="text-sm text-muted-foreground">{step.title}</p>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-sm mb-1">Expected Result</h5>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.expected}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="text-center py-8">
                    <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No test steps defined</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            {loadingHistory ? (
              <div className="text-center py-8">Loading execution history...</div>
            ) : executionHistory.length > 0 ? (
              <>
                {/* Execution Stats */}
                {(() => {
                  const stats = getExecutionStats();
                  return stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold">{stats.total}</div>
                          <div className="text-sm text-muted-foreground">Total Executions</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                          <div className="text-sm text-muted-foreground">Passed</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                          <div className="text-sm text-muted-foreground">Failed</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{stats.passRate}%</div>
                          <div className="text-sm text-muted-foreground">Pass Rate</div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null;
                })()}

                {/* Execution History List */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Execution History</h3>
                  <div className="space-y-3">
                    {executionHistory.map((execution) => (
                      <Card key={execution.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleViewExecution(execution)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-sm">
                                  {(execution.profiles?.display_name || execution.profiles?.email)
                                    ?.split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {execution.profiles?.display_name || execution.profiles?.email}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(execution.updated_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getExecutionResultBadge(execution.step_results)}
                              <Badge variant="outline" className="text-xs">
                                {execution.step_results?.filter((s: any) => {
                                  const v = (s?.status ?? s?.result);
                                  return v === 'pass' || v === 'passed';
                                }).length || 0}/{execution.step_results?.length || 0} steps
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Step Results Preview */}
                          {execution.step_results && execution.step_results.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <span>Click to view detailed results</span>
                              </div>
                              <div className="grid gap-2">
                                {execution.step_results.slice(0, 3).map((stepResult: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                                    <span>Step {index + 1}</span>
                                    <Badge 
                                      variant={stepResult.result === 'pass' ? 'default' : stepResult.result === 'fail' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {stepResult.result}
                                    </Badge>
                                  </div>
                                ))}
                                {execution.step_results.length > 3 && (
                                  <div className="text-xs text-muted-foreground text-center py-1">
                                    +{execution.step_results.length - 3} more steps
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-2">No Execution History</h3>
                  <p className="text-muted-foreground">This test hasn't been executed yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="outline" onClick={() => onEdit(test)}>
                Edit Test
              </Button>
            )}
            <Button onClick={() => onExecute(test)}>
              Execute Test
            </Button>
          </div>
        </div>

        {/* Test Execution Result Dialog */}
        <TestExecutionResultDialog
          execution={selectedExecution}
          test={test}
          open={executionResultDialogOpen}
          onOpenChange={setExecutionResultDialogOpen}
          onEditTest={onEdit}
          onReassignTest={() => {
            setExecutionResultDialogOpen(false);
            fetchExecutionHistory();
          }}
          canManage={canManage}
        />
      </DialogContent>
    </Dialog>
  );
}