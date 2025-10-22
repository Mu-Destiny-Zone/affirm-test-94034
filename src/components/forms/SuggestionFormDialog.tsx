import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Tag } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

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
  org_id: string;
  test_id: string | null;
}

interface SuggestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion?: SuggestionWithDetails | null;
  onSuccess: () => void;
}

export function SuggestionFormDialog({ open, onOpenChange, suggestion, onSuccess }: SuggestionFormDialogProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  
  const [tests, setTests] = useState<Array<{id: string, title: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; display_name: string | null; email: string }>>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    impact: 'medium' as 'low' | 'medium' | 'high',
    status: 'new' as 'new' | 'consider' | 'planned' | 'done' | 'rejected',
    test_id: 'none',
    tags: [] as string[],
    assignee_id: 'none'
  });

  useEffect(() => {
    if (open && currentOrg) {
      fetchTests();
      fetchOrgMembers();
      if (suggestion) {
        setFormData({
          title: suggestion.title,
          description: suggestion.description || '',
          impact: suggestion.impact,
          status: suggestion.status,
          test_id: suggestion.test_id || 'none',
          tags: suggestion.tags || [],
          assignee_id: (suggestion as any).assignee_id || 'none'
        });
      } else {
        resetForm();
      }
    }
  }, [open, suggestion, currentOrg]);

  const fetchTests = async () => {
    if (!currentOrg) return;
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('id, title')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null)
        .order('title');

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      impact: 'medium',
      status: 'new',
      test_id: 'none',
      tags: [],
      assignee_id: 'none'
    });
    setTagInput('');
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async () => {
    if (!user || !currentOrg || !formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the title',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const suggestionData = {
        org_id: currentOrg.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        impact: formData.impact,
        status: formData.status,
        test_id: formData.test_id === 'none' ? null : formData.test_id || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        author_id: user.id,
        assignee_id: formData.assignee_id !== 'none' ? formData.assignee_id : null
      };

      const previousAssigneeId = suggestion ? (suggestion as any).assignee_id : null;
      const newAssigneeId = formData.assignee_id !== 'none' ? formData.assignee_id : null;

      const { data, error } = suggestion 
        ? await supabase.from('suggestions').update(suggestionData).eq('id', suggestion.id).select().single()
        : await supabase.from('suggestions').insert(suggestionData).select().single();

      if (error) throw error;

      // Create notification if someone was assigned
      if (newAssigneeId && newAssigneeId !== user.id && newAssigneeId !== previousAssigneeId) {
        await supabase.from('notifications').insert({
          user_id: newAssigneeId,
          org_id: currentOrg.id,
          title: 'Suggestion Assigned to You',
          message: `You have been assigned to suggestion: "${formData.title.trim()}"`,
          type: 'suggestion_assigned',
          entity_type: 'suggestion',
          entity_id: data.id
        });
      }

      toast({
        title: 'Success',
        description: `Suggestion ${suggestion ? 'updated' : 'created'} successfully`
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving suggestion:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save suggestion',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {suggestion ? 'Edit Suggestion' : 'Create New Suggestion'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief, descriptive title for your suggestion..."
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of your suggestion..."
              rows={4}
              className="text-base resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Impact Level</Label>
            <Select 
              value={formData.impact} 
              onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, impact: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {suggestion && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'new' | 'consider' | 'planned' | 'done' | 'rejected') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="consider">Under Consideration</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select 
              value={formData.assignee_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
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

          {tests.length > 0 && (
            <div className="space-y-2">
              <Label>Related Test (Optional)</Label>
              <Select 
                value={formData.test_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, test_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select related test..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No related test</SelectItem>
                  {tests.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <Label>Tags</Label>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={handleTagKeyPress}
                    className="flex-1 text-base"
                  />
                  <Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTag(tag)}
                          className="h-auto p-0 hover:bg-transparent text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
            >
              {loading ? 'Saving...' : (suggestion ? 'Update Suggestion' : 'Create Suggestion')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}