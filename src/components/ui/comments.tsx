import { useState, useEffect } from 'react';
import { MessageCircle, Send, Edit2, X, Check } from 'lucide-react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { z } from 'zod';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface CommentsProps {
  targetType: 'bug' | 'suggestion' | 'test';
  targetId: string;
}

const commentSchema = z.object({
  body: z.string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be less than 2000 characters')
});

export function Comments({ targetType, targetId }: CommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchComments();
  }, [targetId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          body,
          created_at,
          author_id,
          profiles!comments_author_id_fkey(id, display_name, email, avatar_url)
        `)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!user || !currentOrg) return;

    // Validate input
    const validation = commentSchema.safeParse({ body: newComment });
    if (!validation.success) {
      toast({
        title: 'Invalid Comment',
        description: validation.error.errors[0].message,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          org_id: currentOrg.id,
          author_id: user.id,
          target_type: targetType,
          target_id: targetId,
          body: newComment.trim(),
          mentions: [],
          reactions: {}
        });

      if (error) {
        throw error;
      }

      setNewComment('');
      fetchComments();
      toast({
        title: 'Success',
        description: 'Comment added successfully'
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    const validation = commentSchema.safeParse({ body: editText });
    if (!validation.success) {
      toast({
        title: 'Invalid Comment',
        description: validation.error.errors[0].message,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .update({ body: editText.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditText('');
      fetchComments();
      toast({
        title: 'Success',
        description: 'Comment updated successfully'
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id} className="border-l-4 border-l-primary/20">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {comment.profiles?.display_name?.[0] || comment.profiles?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.profiles?.display_name || comment.profiles?.email || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      {user && comment.author_id === user.id && editingId !== comment.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(comment)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditComment(comment.id)}
                            disabled={loading || !editText.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{comment.body}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="resize-none"
            rows={2}
          />
          <Button
            onClick={handleAddComment}
            disabled={loading || !newComment.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}