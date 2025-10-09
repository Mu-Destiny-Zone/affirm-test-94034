import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Test } from '@/lib/types';
import { TrendingUp, CheckCircle, XCircle as XCircleIcon, Clock } from 'lucide-react';

interface TestCardExecutionStatsProps {
  test: Test & {
    executionStats?: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
    };
    assignments?: any[];
  };
  onViewExecution?: (execution: any, test: any) => void;
  canManage?: boolean;
  isAdmin?: boolean;
  currentUserId?: string;
}

export function TestCardExecutionStats({ test, onViewExecution, canManage, isAdmin, currentUserId }: TestCardExecutionStatsProps) {

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
      return <Badge variant="destructive" className="text-xs"><XCircleIcon className="w-3 h-3 mr-1" />Failed</Badge>;
    } else if (allPassed) {
      return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Passed</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
    }
  };

  const handleViewExecutionFromCard = (assignment: any) => {
    if (onViewExecution) {
      onViewExecution(assignment, test);
    }
  };

  if (!test.executionStats || test.executionStats.total === 0) return null;

  return (
    <div className="pt-3 border-t border-border">
      <div className="w-full mb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{test.executionStats.passed} passed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>{test.executionStats.failed} failed</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{test.executionStats.passRate}% pass rate</span>
            </div>
          </div>
          
          {/* Recent executions - admins see all, users see only their own */}
          {(canManage || currentUserId) && (
            <div className="space-y-2 w-full">
              {test.assignments?.filter((a: any) => {
                  // Filter based on user role
                  const hasResults = a.step_results && Array.isArray(a.step_results) && a.step_results.length > 0;
                  if (!hasResults) return false;
                  
                  // Admins/managers can see all assignments, regular users only their own
                  return canManage ? true : a.assignee_id === currentUserId;
                })
                .slice(0, 3)
                .map((assignment: any) => (
                <div key={assignment.id} className="w-full flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors min-h-[3rem]" onClick={() => handleViewExecutionFromCard(assignment)}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-sm">
                        {(assignment.profiles?.display_name || assignment.profiles?.email)
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground text-sm font-medium">
                      {canManage 
                        ? (assignment.profiles?.display_name || assignment.profiles?.email)
                        : 'Your execution'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getExecutionResultBadge(assignment.step_results)}
                    <span className="text-muted-foreground text-sm">
                      {new Date(assignment.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}