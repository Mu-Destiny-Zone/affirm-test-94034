import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, User, Calendar, FileText, AlertTriangle, Edit, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestExecutionResultDialogProps {
  execution: any | null;
  test: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditTest?: (test: any) => void;
  onReassignTest?: () => void;
  canManage?: boolean;
}

export function TestExecutionResultDialog({ execution, test, open, onOpenChange, onEditTest, onReassignTest, canManage }: TestExecutionResultDialogProps) {
  const { toast } = useToast();
  if (!execution || !test) return null;

  const handleReassign = async () => {
    try {
      // Update the existing test assignment to reset it for re-execution
      const { error } = await supabase
        .from('test_assignments')
        .update({
          state: 'assigned',
          step_results: [],
          notes: 'Reassigned for re-execution'
        })
        .eq('id', execution.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test reassigned successfully. The assignee will be notified.'
      });

      onOpenChange(false);
      onReassignTest?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'skip': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'pass': return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Passed</Badge>;
      case 'fail': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case 'skip': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Skipped</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const normalizeStep = (step: any) => {
    let v = (step?.status ?? step?.result);
    if (v === 'passed') return 'pass';
    if (v === 'failed') return 'fail';
    if (v === 'skipped') return 'skip';
    return v;
  };

  const getOverallResult = () => {
    const stepResults = execution.step_results || [];
    if (stepResults.length === 0) return 'No Results';
    
    const hasFailures = stepResults.some((step: any) => normalizeStep(step) === 'fail');
    const allPassed = stepResults.every((step: any) => normalizeStep(step) === 'pass');
    const hasSkipped = stepResults.some((step: any) => normalizeStep(step) === 'skip');
    
    if (hasFailures) return 'Failed';
    if (allPassed) return 'Passed';
    if (hasSkipped) return 'Partial';
    return 'In Progress';
  };

  const getOverallResultBadge = () => {
    const result = getOverallResult();
    switch (result) {
      case 'Passed': return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Passed</Badge>;
      case 'Failed': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case 'Partial': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial</Badge>;
      default: return <Badge variant="outline">{result}</Badge>;
    }
  };

  const stepResults = execution.step_results || [];
  const testSteps = test.steps || [];
  const passedCount = stepResults.filter((step: any) => normalizeStep(step) === 'pass').length;
  const failedCount = stepResults.filter((step: any) => normalizeStep(step) === 'fail').length;
  const skippedCount = stepResults.filter((step: any) => normalizeStep(step) === 'skip').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8">Test Execution Result</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Execution Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{test.title}</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {(execution.profiles?.display_name || execution.profiles?.email)
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    Executed by {execution.profiles?.display_name || execution.profiles?.email}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(execution.updated_at), 'PPp')}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              {getOverallResultBadge()}
            </div>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stepResults.length}</div>
                <div className="text-sm text-muted-foreground">Total Steps</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{skippedCount}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </CardContent>
            </Card>
          </div>

          {/* Execution Notes */}
          {execution.notes && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Execution Notes
              </h4>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{execution.notes}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Separator />

          {/* Step Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Step-by-Step Results</h4>
              <span className="text-sm text-muted-foreground">
                {passedCount}/{stepResults.length} steps passed
              </span>
            </div>

            {stepResults.length > 0 ? (
              <div className="space-y-3">
                {stepResults.map((stepResult: any, index: number) => {
                  const testStep = testSteps[index];
                    return (
                      <Card key={index} className={`border-l-4 ${
                        (normalizeStep(stepResult) === 'pass') ? 'border-l-green-500' :
                        (normalizeStep(stepResult) === 'fail') ? 'border-l-red-500' :
                        (normalizeStep(stepResult) === 'skip') ? 'border-l-yellow-500' :
                        'border-l-gray-500'
                      }`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs">
                                {index + 1}
                              </span>
                              Step {index + 1}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {getResultIcon(normalizeStep(stepResult))}
                              {getResultBadge(normalizeStep(stepResult))}
                            </div>
                          </div>
                        </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {/* Test Step Definition */}
                        {testStep && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 p-3 bg-muted/30 rounded">
                            <div>
                              <h6 className="font-medium text-xs mb-1 text-muted-foreground uppercase tracking-wide">Action</h6>
                              <p className="text-sm">{testStep.title}</p>
                            </div>
                            <div>
                              <h6 className="font-medium text-xs mb-1 text-muted-foreground uppercase tracking-wide">Expected Result</h6>
                              <p className="text-sm">{testStep.expected}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Execution Result Details */}
                        <div className="space-y-2">
                          <h6 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Execution Result</h6>
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getResultIcon(normalizeStep(stepResult))}
                                <span className="font-medium text-sm">
                                  {normalizeStep(stepResult) === 'pass' ? 'Step Passed' :
                                   normalizeStep(stepResult) === 'fail' ? 'Step Failed' :
                                   normalizeStep(stepResult) === 'skip' ? 'Step Skipped' :
                                   'Unknown Result'}
                                </span>
                              </div>
                              {stepResult.notes && (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-3">
                                  {stepResult.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No step results found</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canManage && (
              <div className="flex gap-2">
                {onEditTest && (
                  <Button variant="outline" onClick={() => onEditTest(test)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Test
                  </Button>
                )}
                <Button onClick={handleReassign}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reassign
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}