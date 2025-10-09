import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { VotePanel } from '@/components/shared/VotePanel';
import { Comments } from '@/components/ui/comments';
import { Lightbulb, Edit, Target, Tag, User, Calendar, TestTube } from 'lucide-react';

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
  project_id: string;
  org_id: string;
  test_id: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
    email: string;
  };
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
}

export function SuggestionDetailDialog({ 
  open, 
  onOpenChange, 
  suggestion,
  onEdit,
  onStatusChange 
}: SuggestionDetailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  if (!suggestion) return null;

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

                {/* Edit Button */}
                {suggestion.author_id === user?.id && onEdit && (
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
    </Dialog>
  );
}