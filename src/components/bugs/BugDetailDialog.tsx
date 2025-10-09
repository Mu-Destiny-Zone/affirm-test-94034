import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VotePanel } from '@/components/shared/VotePanel';
import { Comments } from '@/components/ui/comments';
import { BugReport, BugSeverity, BugStatus } from '@/lib/types';
import { Bug, Edit, AlertCircle, User, Calendar, ExternalLink, List, Video } from 'lucide-react';

interface BugDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bug: BugReport | null;
  onEdit?: (bug: BugReport) => void;
}

export function BugDetailDialog({ 
  open, 
  onOpenChange, 
  bug,
  onEdit
}: BugDetailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  if (!bug) return null;

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

                {/* Edit Button */}
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
              </div>

              {/* Context & Tags Row */}
              {((bug as any).projects?.name || (bug.tags && bug.tags.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  {/* Project Context */}
                  {(bug as any).projects?.name && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-lg">
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                      <span className="text-xs font-medium text-secondary-foreground">
                        {(bug as any).projects.name}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {bug.tags && Array.isArray(bug.tags) && bug.tags.length > 0 && (
                    <>
                      {(bug as any).projects?.name && <div className="w-px h-4 bg-border mx-1"></div>}
                      {bug.tags.map((tag: string, index: number) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs px-2 py-0.5 bg-background/50 hover:bg-background transition-colors"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </>
                  )}
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
              projectId={bug.project_id}
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
    </Dialog>
  );
}