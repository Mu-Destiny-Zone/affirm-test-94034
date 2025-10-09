import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Test } from '@/lib/types';
import { Clock, Play, XCircle, TestTube, MoreHorizontal, Edit, Trash2, Users, PlayCircle, AlertTriangle, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TestCardMetadata } from './TestCardMetadata';
import { TestCardAssignees } from './TestCardAssignees';
import { TestCardExecutionStats } from './TestCardExecutionStats';

import { useAuth } from '@/hooks/useAuth';

interface TestAssignee {
  id: string;
  assignee_id: string;
  state: string;
  due_date: string | null;
  profiles: {
    display_name: string | null;
    email: string;
  };
}

interface TestCardProps {
  test: Test & {
    executionStats?: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
    };
    lastExecution?: any;
    assignments?: any[];
  };
  onEdit: (test: Test) => void;
  onDelete: (test: Test) => void;
  onExecute: (test: Test) => void;
  onViewDetails: (test: Test) => void;
  onAssign: (test: Test) => void;
  onCopy?: (test: Test) => void;
  onViewExecution?: (execution: any, test: any) => void;
  canManage: boolean;
  isAdmin?: boolean;
  isManager?: boolean;
}

export function TestCard({ test, onEdit, onDelete, onExecute, onViewDetails, onAssign, onCopy, onViewExecution, canManage, isAdmin, isManager }: TestCardProps) {
  const [assignees, setAssignees] = useState<TestAssignee[]>([]);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (canManage) {
      fetchAssignees();
    }
  }, [test.id, canManage]);

  const fetchAssignees = async () => {
    try {
      const { data, error } = await supabase
        .from('test_assignments')
        .select(`
          id,
          assignee_id,
          state,
          due_date,
          profiles:assignee_id (
            display_name,
            email
          )
        `)
        .eq('test_id', test.id)
        .is('deleted_at', null);

      if (error) throw error;
      setAssignees(data || []);
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'archived') => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', test.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: `Test status updated to ${newStatus}`,
      });

      // Trigger parent refresh
      onEdit(test);
    } catch (error) {
      console.error('Error updating test status:', error);
      toast({
        title: t('error'),
        description: 'Failed to update test status',
        variant: 'destructive',
      });
    }
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 overflow-hidden">
      {/* Header Section */}
      <CardHeader className="pb-4 bg-gradient-to-r from-background via-muted/20 to-background border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle 
                  className="text-lg font-semibold line-clamp-2 group-hover:text-primary cursor-pointer transition-colors" 
                  onClick={() => onViewDetails(test)}
                >
                  {test.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{test.steps?.length || 0} {t('steps')}</span>
                  {test.priority > 1 && (
                    <>
                      <span>•</span>
                      <Badge variant={getPriorityColor(test.priority)} className="text-xs px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {getPriorityLabel(test.priority)}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={getStatusColor(test.status)} className="flex items-center gap-1.5 px-2.5 py-1">
                {getStatusIcon(test.status)}
                <span className="capitalize font-medium">{test.status}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        {test.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-3 leading-relaxed">
            {test.description}
          </p>
        )}
      </CardHeader>

      {/* Content Section */}
      <CardContent className="p-0">
        {/* Main Info Grid */}
        <div className={`grid grid-cols-1 ${canManage ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} divide-y lg:divide-y-0 lg:divide-x`}>
          {/* Metadata Section */}
          <div className="p-3 lg:p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('testDetails')}</h4>
            <TestCardMetadata test={test} />
          </div>

          {/* Assignees Section - Only for admins/managers */}
          {canManage && (
            <div className="p-3 lg:p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('assignmentsSection')}</h4>
              <TestCardAssignees assignees={assignees} canManage={canManage} />
            </div>
          )}

          {/* Execution Stats Section */}
          <div className="p-3 lg:p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('executionStats')}</h4>
            <TestCardExecutionStats test={test} onViewExecution={onViewExecution} canManage={canManage} isAdmin={isAdmin} currentUserId={user?.id} />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between p-4 bg-muted/30 border-t">
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onExecute(test)}
              className="flex items-center gap-1.5 font-medium"
            >
              <PlayCircle className="h-4 w-4" />
              {t('executeTest')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(test)}
              className="flex items-center gap-1.5"
            >
              <TestTube className="h-4 w-4" />
              {t('viewDetails')}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <Select value={test.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Draft
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <Play className="h-3 w-3" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3" />
                      Archived
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {(isAdmin || isManager) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onAssign(test)}
                        className="flex items-center gap-1.5"
                        disabled={test.status === 'draft'}
                      >
                        <Users className="h-4 w-4" />
                        {t('assign')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {test.status === 'draft' && (
                    <TooltipContent>
                      <p>Cannot assign draft tests. Change status to "Active" first.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            
            {(isAdmin || isManager) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(test)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('editTest')}
                  </DropdownMenuItem>
                  {isAdmin && onCopy && (
                    <DropdownMenuItem onClick={() => onCopy(test)}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t('copyToAnotherOrg')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDelete(test)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('deleteTest')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}