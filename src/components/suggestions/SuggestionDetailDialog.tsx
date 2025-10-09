import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useToast } from '@/hooks/use-toast';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { VotePanel } from '@/components/shared/VotePanel';
import { Comments } from '@/components/ui/comments';
import { Lightbulb, Edit, Target, Tag, User, Calendar, TestTube, Trash2 } from 'lucide-react';

interface SuggestionWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: 'new' | 'consider' | 'planned' | 'done' | 'rejected';
  impact: 'low' | 'medium' | 'high';
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  author_id: string;
  owner_id: string | null;
  project_id: string;
  org_id: string;
  test_id: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
    email: string;
  };
  owner?: {
    id: string;
    display_name: string | null;
    email: string;
  } | null;
  projects?: {
    id: string;
    name: string;
  };
  tests?: {
    id: string;
    title: string;
  };
}

interface SuggestionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: SuggestionWithDetails | null;
  onEdit?: (suggestion: SuggestionWithDetails) => void;
  onStatusChange?: () => void;
  onDelete?: () => void;
}

export function SuggestionDetailDialog({ 
  open, 
  onOpenChange, 
  suggestion,
  onEdit,
  onStatusChange,
  onDelete
}: SuggestionDetailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin, isManager } = useCurrentOrgRole();
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!suggestion) return null;

  const canDelete = isAdmin || isManager;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_suggestion', { suggestion_id: suggestion.id });

      if (error) {
        console.error('Error deleting suggestion:', error);
        toast({
          title: "Error",
          description: "Failed to delete suggestion",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Suggestion deleted successfully"
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

  const updateSuggestionStatus = async (suggestionId: string, status: 'new' | 'consider' | 'planned' | 'done' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error updating suggestion status:', error);
        toast({
          title: "Error",
          description: "Failed to update suggestion status",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success", 
          description: "Suggestion status updated"
        });
        onStatusChange?.();
      }
    } catch (error) {
      console.error('Error in updateSuggestionStatus:', error);
    }
  };

  const getImpactColor = (impact: string): "default" | "destructive" | "secondary" => {
    const colors = {
      'low': 'secondary' as const,
      'medium': 'default' as const,
      'high': 'destructive' as const
    };
    return colors[impact as keyof typeof colors] || colors.medium;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lightbulb className="h-5 w-5 text-primary" />
            {suggestion.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            Suggestion details and community feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enhanced Header Info */}
          <div className="relative">
            <div className="bg-gradient-to-r from-card to-card/50 border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Status & Impact Section */}
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 rounded-full border">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      suggestion.status === 'new' ? 'bg-primary shadow-primary/30 shadow-md' :
                      suggestion.status === 'consider' ? 'bg-accent shadow-accent/30 shadow-md' :
                      suggestion.status === 'planned' ? 'bg-secondary shadow-secondary/30 shadow-md' :
                      suggestion.status === 'done' ? 'bg-success shadow-success/30 shadow-md' :
                      'bg-destructive shadow-destructive/30 shadow-md'
                    } animate-pulse`} />
                    <span className="text-sm font-medium capitalize">
                      {suggestion.status === 'consider' ? 'Under Review' : 
                       suggestion.status === 'planned' ? 'Planned' :
                       suggestion.status === 'done' ? 'Completed' :
                       suggestion.status}
                    </span>
                  </div>

                  {/* Impact Badge */}
                  <Badge 
                    variant={getImpactColor(suggestion.impact)}
                    className="text-sm px-3 py-1.5 font-medium shadow-sm"
                  >
                    <Target className="h-3.5 w-3.5 mr-1.5" />
                    {suggestion.impact.charAt(0).toUpperCase() + suggestion.impact.slice(1)} Impact
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {(suggestion.author_id === user?.id || suggestion.owner_id === user?.id) && onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(suggestion)}
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

              {/* Context & Tags Row */}
              {(suggestion.tests || (suggestion.tags && suggestion.tags.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  {/* Test Context */}
                  {suggestion.tests && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-lg">
                      <TestTube className="h-3 w-3 text-secondary" />
                      <span className="text-xs font-medium text-secondary-foreground">
                        {suggestion.tests.title}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {suggestion.tags && Array.isArray(suggestion.tags) && suggestion.tags.length > 0 && (
                    <>
                      {suggestion.tests && <div className="w-px h-4 bg-border mx-1"></div>}
                      {suggestion.tags.map((tag: string, index: number) => (
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
          {suggestion.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                {suggestion.description}
              </p>
            </div>
          )}

          {/* Author Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Suggested By
            </h4>
            <div className="bg-muted/50 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{suggestion.profiles?.display_name || suggestion.profiles?.email || 'Unknown'}</span>
            </div>
          </div>

          {/* Owner Info */}
          {suggestion.owner && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Owner / Responsible
              </h4>
              <div className="bg-primary/10 px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-primary/20">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">{suggestion.owner.display_name || suggestion.owner.email}</span>
              </div>
            </div>
          )}



          <div className="space-y-2">
            <VotePanel 
              targetType="suggestion"
              targetId={suggestion.id}
              variant="default"
            />
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Discussion</h4>
            <Comments 
              targetType="suggestion"
              targetId={suggestion.id}
            />
          </div>

          {/* Footer Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>
                {suggestion.profiles?.display_name || suggestion.profiles?.email || 'Unknown User'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(suggestion.created_at).toLocaleDateString('en-US', { 
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
            <AlertDialogTitle>Delete Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{suggestion.title}"? This action cannot be undone.
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