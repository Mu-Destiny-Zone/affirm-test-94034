import { Badge } from '@/components/ui/badge';
import { Test } from '@/lib/types';
import { CheckCircle, XCircle as XCircleIcon, Clock } from 'lucide-react';

interface TestCardMetadataProps {
  test: Test & {
    lastExecution?: any;
  };
}

export function TestCardMetadata({ test }: TestCardMetadataProps) {
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 0: return 'secondary';
      case 1: return 'default';
      case 2: return 'destructive';
      case 3: return 'destructive';
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Created {new Date(test.created_at).toLocaleDateString()}</span>
        {test.updated_at !== test.created_at && (
          <span>• Updated {new Date(test.updated_at).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {test.priority > 0 && (
          <Badge variant={getPriorityColor(test.priority)} className="text-xs">
            {getPriorityLabel(test.priority)}
          </Badge>
        )}
        {test.lastExecution && getExecutionResultBadge(test.lastExecution.step_results)}
      </div>
    </div>
  );
}