import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VotePanel } from '@/components/shared/VotePanel';
import { Comments } from '@/components/ui/comments';
import { BugReport, BugSeverity, BugStatus } from '@/lib/types';
import { Bug, Edit, AlertCircle, User, Calendar, ExternalLink, List, Video, Trash2, UserCheck } from 'lucide-react';

interface BugDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bug: BugReport | null;
  onEdit?: (bug: BugReport) => void;
  onDelete?: () => void;
}

export function BugDetailDialog({ 
  open, 
  onOpenChange, 
  bug,
  onEdit,
  onDelete
}: BugDetailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const { isAdmin, isManager } = useCurrentOrgRole();
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; display_name: string | null; email: string }>>([]);
  const [assigneeId, setAssigneeId] = useState<string>('none');
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  useEffect(() => {
    if (open && currentOrg) {
      fetchOrgMembers();
      setAssigneeId((bug as any)?.assignee_id || 'none');
    }
  }, [open, currentOrg, bug]);

  const fetchOrgMembers = async () => {
    if (!currentOrg) return;
    
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          profile_id,
          profiles!org_members_profile_id_fkey (
            id,
            display_name,
            email
          )
        `)
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null);

      if (error) throw error;

      const members = data?.map((m: any) => ({
        id: m.profiles.id,
        display_name: m.profiles.display_name,
        email: m.profiles.email
      })) || [];

      setOrgMembers(members);
    } catch (error) {
      console.error('Error fetching org members:', error);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!bug || !user || !currentOrg) return;

    setUpdatingAssignee(true);
    try {
      const previousAssigneeId = assigneeId !== 'none' ? assigneeId : null;
      const assigneeValue = newAssigneeId !== 'none' ? newAssigneeId : null;

      const { error } = await supabase
        .from('bug_reports')
        .update({ assignee_id: assigneeValue })
        .eq('id', bug.id);

      if (error) throw error;

      // Create notification if someone was assigned
      if (assigneeValue && assigneeValue !== user.id && assigneeValue !== previousAssigneeId) {
        await supabase.from('notifications').insert({
          user_id: assigneeValue,
          org_id: currentOrg.id,
          title: 'Bug Assigned to You',
          message: `You have been assigned to bug: "${bug.title}"`,
          type: 'bug_assigned',
          entity_type: 'bug',
          entity_id: bug.id
        });
      }

      setAssigneeId(newAssigneeId);
      toast({
        title: 'Success',
        description: assigneeValue ? 'Bug assigned successfully' : 'Assignment removed'
      });
    } catch (error: any) {
      console.error('Error updating assignee:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignee',
        variant: 'destructive'
      });
    } finally {
      setUpdatingAssignee(false);
    }
  };

  if (!bug) return null;

  const canDelete = isAdmin || isManager;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_bug', { bug_id: bug.id });

      if (error) {
        console.error('Error deleting bug:', error);
        toast({
          title: "Error",
          description: "Failed to delete bug report",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Bug report deleted successfully"
        });
        setDeleteDialogOpen(false);
        onOpenChange(false);
        onDelete?.();
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const getSeverityColor = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bug className="h-5 w-5 text-destructive" />
            {bug.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            Bug report details and community feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enhanced Header Info */}
          <div className="relative">
            <div className="bg-gradient-to-r from-card to-card/50 border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Status & Severity Section */}
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 rounded-full border">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      bug.status === 'new' ? 'bg-primary shadow-primary/30 shadow-md' :
                      bug.status === 'in_progress' ? 'bg-accent shadow-accent/30 shadow-md' :
                      bug.status === 'fixed' ? 'bg-success shadow-success/30 shadow-md' :
                      'bg-muted-foreground shadow-muted/30 shadow-md'
                    } animate-pulse`} />
                    <span className="text-sm font-medium capitalize">
                      {bug.status === 'in_progress' ? 'In Progress' : 
                       bug.status === 'fixed' ? 'Fixed' :
                       bug.status}
                    </span>
                  </div>

                  {/* Severity Badge */}
                  <Badge 
                    variant={getSeverityColor(bug.severity)}
                    className="text-sm px-3 py-1.5 font-medium shadow-sm"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    {bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1)} Severity
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {bug.reporter_id === user?.id && onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(bug)}
                      className="hover:bg-primary/5 hover:border-primary/20 transition-all"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="hover:bg-destructive/10 hover:border-destructive/20 text-destructive transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* Tags Row */}
              {bug.tags && bug.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  {bug.tags.map((tag: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 bg-background/50 hover:bg-background transition-colors"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {bug.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                {bug.description}
              </p>
            </div>
          )}

          {/* Reproduction Steps */}
          {bug.repro_steps && Array.isArray(bug.repro_steps) && bug.repro_steps.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <List className="h-4 w-4" />
                Reproduction Steps
              </h4>
              <div className="bg-muted/50 p-3 rounded-lg">
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  {bug.repro_steps.map((step: any, index: number) => (
                    <li key={index}>{typeof step === 'string' ? step : step.step || step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Video Link */}
          {bug.youtube_url && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Demonstration
              </h4>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm">Video available</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(bug.youtube_url, '_blank')}
                >
                  Watch
                </Button>
              </div>
            </div>
          )}

          {/* Assignee */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Assigned To
            </h4>
            <Select 
              value={assigneeId} 
              onValueChange={handleAssigneeChange}
              disabled={updatingAssignee}
            >
              <SelectTrigger data-testid="bug-assignee-select">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {orgMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <VotePanel 
              targetType="bug"
              targetId={bug.id}
              variant="default"
            />
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Discussion</h4>
            <Comments 
              targetType="bug"
              targetId={bug.id}
            />
          </div>

          {/* Footer Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>
                {bug.profiles?.display_name || bug.profiles?.email || 'Unknown User'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(bug.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bug Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{bug.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}