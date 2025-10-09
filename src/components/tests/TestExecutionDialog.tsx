import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Test, TestAssignment, AssignmentState, StepResult } from '@/lib/types';
import { CheckCircle2, XCircle, AlertCircle, TestTube, Play, Save, CheckCircle } from 'lucide-react';

interface TestExecutionDialogProps {
  test: Test | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecutionComplete: () => void;
}

type ComponentStepResult = 'passed' | 'failed' | 'skipped';

export function TestExecutionDialog({ test, open, onOpenChange, onExecutionComplete }: TestExecutionDialogProps) {
  // Early return before any hooks
  if (!test) return null;

  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stepResults, setStepResults] = useState<{ result: ComponentStepResult; notes?: string }[]>([]);
  const [globalNotes, setGlobalNotes] = useState('');
  const [existingAssignment, setExistingAssignment] = useState<TestAssignment | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Fetch existing assignment when dialog opens
  useEffect(() => {
    const fetchExistingAssignment = async () => {
      if (!open || !test || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('test_assignments')
          .select('*')
          .eq('test_id', test.id)
          .eq('assignee_id', user.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (error) {
          console.error('Error fetching assignment:', error);
          return;
        }

        if (data) {
          setExistingAssignment(data as unknown as TestAssignment);
          setIsFinished(data.state === 'done');
          
          // Load existing results if available - convert from database format
          if (data.step_results && Array.isArray(data.step_results)) {
            const convertedResults = (data.step_results as any[]).map((dbResult: any) => {
              const resultMap: Record<string, ComponentStepResult> = {
                'pass': 'passed',
                'fail': 'failed', 
                'skip': 'skipped'
              };
              return { 
                result: resultMap[dbResult.status] || 'passed',
                notes: dbResult.notes 
              };
            });
            setStepResults(convertedResults);
          } else {
            // Initialize with default values
            setStepResults((test.steps || []).map(() => ({ result: 'passed' as ComponentStepResult })));
          }
          
          setGlobalNotes(data.notes || '');
        } else {
          // No existing assignment, initialize fresh
          setExistingAssignment(null);
          setIsFinished(false);
          setStepResults((test.steps || []).map(() => ({ result: 'passed' as ComponentStepResult })));
          setGlobalNotes('');
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
      }
    };

    fetchExistingAssignment();
  }, [open, test, user]);

  const updateStepResult = (index: number, result: ComponentStepResult, notes?: string) => {
    setStepResults(prev => {
      const updated = [...prev];
      updated[index] = { result, notes };
      return updated;
    });
  };

  const getResultIcon = (result: ComponentStepResult) => {
    switch (result) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };

  const getResultColor = (result: ComponentStepResult) => {
    switch (result) {
      case 'passed': return 'default';
      case 'failed': return 'destructive';
      case 'skipped': return 'secondary';
    }
  };

  const getOverallResult = () => {
    if (stepResults.length === 0) return 'pending';
    
    const hasFailedRequired = stepResults.some((result, index) => {
      const step = test.steps?.[index];
      return step?.required && result.result === 'failed';
    });
    
    if (hasFailedRequired) return 'failed';
    
    const hasFailed = stepResults.some(result => result.result === 'failed');
    if (hasFailed) return 'failed';
    
    const allCompleted = stepResults.every(result => result.result !== 'skipped');
    return allCompleted ? 'passed' : 'partial';
  };

  const handleSaveExecution = async (finish: boolean = false) => {
    if (!user || !test) return;

    setLoading(true);
    try {
      const overallResult = getOverallResult();
      
      // Determine the state based on action and results
      let state: AssignmentState;
      if (finish) {
        state = 'done'; // Mark as completed/finished
      } else {
        state = 'in_progress'; // Allow further editing
      }
      
      // Convert component format to database format
      const dbStepResults: StepResult[] = stepResults.map((result, index) => ({
        step_index: index,
        status: result.result === 'passed' ? 'pass' : 
                result.result === 'failed' ? 'fail' : 'skip',
        notes: result.notes,
      }));
      
      const assignmentData = {
        org_id: test.org_id,
        test_id: test.id,
        assignee_id: user.id,
        state,
        step_results: dbStepResults as any,
        notes: globalNotes.trim() || null
      };

      let error;
      
      if (existingAssignment) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('test_assignments')
          .update({
            state,
            step_results: dbStepResults as any, // Cast to Json type
            notes: globalNotes.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAssignment.id);
        
        error = updateError;
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('test_assignments')
          .insert(assignmentData);
        
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: finish 
          ? 'Test execution completed and finalized' 
          : 'Test execution progress saved successfully'
      });

      if (finish) {
        setIsFinished(true);
      }
      
      onOpenChange(false);
      onExecutionComplete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Manual Test Execution: {test.title}
            {isFinished && (
              <Badge variant="secondary" className="ml-auto">
                <CheckCircle className="h-3 w-3 mr-1" />
                Finished
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {isFinished ? 
                'This test has been completed and finalized. Results are read-only.' :
                'Follow each test step below and record the results. Mark each step as passed, failed, or skipped based on your testing.'
              }
            </p>
          </div>

          {/* All Test Steps */}
          {test.steps && test.steps.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold">Test Steps</h3>
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
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid gap-3">
                      <div>
                        <Label className="font-medium text-sm">Action</Label>
                        <p className="text-sm text-muted-foreground mt-1">{step.title}</p>
                      </div>
                      
                      <div>
                        <Label className="font-medium text-sm">Expected Result</Label>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{step.expected}</p>
                      </div>
                    </div>

                    {/* Result Selection */}
                    {!isFinished && (
                      <div className="space-y-3 pt-3 border-t">
                        <Label className="text-sm font-medium">Test Result:</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={stepResults[index]?.result === 'passed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateStepResult(index, 'passed', stepResults[index]?.notes)}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Pass
                          </Button>
                          <Button
                            variant={stepResults[index]?.result === 'failed' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => updateStepResult(index, 'failed', stepResults[index]?.notes)}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            Fail
                          </Button>
                          <Button
                            variant={stepResults[index]?.result === 'skipped' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => updateStepResult(index, 'skipped', stepResults[index]?.notes)}
                            className="flex items-center gap-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Skip
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Show result if finished */}
                    {isFinished && stepResults[index] && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">Result:</Label>
                          <Badge variant={getResultColor(stepResults[index].result)} className="flex items-center gap-1">
                            {getResultIcon(stepResults[index].result)}
                            {stepResults[index].result.charAt(0).toUpperCase() + stepResults[index].result.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Step Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`step-${index}-notes`} className="text-sm">Notes {isFinished ? '' : '(optional)'}</Label>
                      <Textarea
                        id={`step-${index}-notes`}
                        value={stepResults[index]?.notes || ''}
                        onChange={(e) => !isFinished && updateStepResult(index, stepResults[index]?.result || 'passed', e.target.value)}
                        placeholder={isFinished ? 'No notes provided' : 'Record any observations, issues, or additional details...'}
                        rows={2}
                        className="text-sm"
                        disabled={isFinished}
                      />
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

          {/* Global Notes */}
          <div className="space-y-2">
            <Label htmlFor="global-notes">Overall Test Notes</Label>
            <Textarea
              id="global-notes"
              value={globalNotes}
              onChange={(e) => !isFinished && setGlobalNotes(e.target.value)}
              placeholder={isFinished ? 'No overall notes provided' : 'Add any general observations about the test execution...'}
              rows={3}
              disabled={isFinished}
            />
          </div>

          {/* Summary */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Execution Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-success">
                    {stepResults.filter(r => r.result === 'passed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">
                    {stepResults.filter(r => r.result === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">
                    {stepResults.filter(r => r.result === 'skipped').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {isFinished ? 'Close' : 'Cancel'}
            </Button>
            
            {!isFinished && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleSaveExecution(false)} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Save Progress'}
                </Button>
                <Button 
                  onClick={() => handleSaveExecution(true)} 
                  disabled={loading} 
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Finishing...' : 'Finish Test'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}