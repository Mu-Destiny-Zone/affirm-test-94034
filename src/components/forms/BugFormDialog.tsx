import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { BugReport, BugSeverity } from '@/lib/types';
import { Plus, X } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface BugFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bug?: BugReport | null;
  onSuccess: () => void;
}

export function BugFormDialog({ open, onOpenChange, bug, onSuccess }: BugFormDialogProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orgMembers, setOrgMembers] = useState<Array<{ id: string; display_name: string | null; email: string }>>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as BugSeverity,
    status: 'new' as 'new' | 'in_progress' | 'fixed' | 'closed',
    youtube_url: '',
    repro_steps: [''],
    assignee_id: 'none'
  });

  useEffect(() => {
    if (open && currentOrg) {
      fetchOrgMembers();
      if (bug) {
        setFormData({
          title: bug.title,
          description: bug.description || '',
          severity: bug.severity,
          status: bug.status as 'new' | 'in_progress' | 'fixed' | 'closed',
          youtube_url: bug.youtube_url || '',
          repro_steps: Array.isArray(bug.repro_steps) ? bug.repro_steps as string[] : [''],
          assignee_id: (bug as any).assignee_id || 'none'
        });
      } else {
        resetForm();
      }
    }
  }, [open, bug, currentOrg]);

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
      severity: 'medium',
      status: 'new',
      youtube_url: '',
      repro_steps: [''],
      assignee_id: 'none'
    });
  };

  const addReproStep = () => {
    setFormData(prev => ({
      ...prev,
      repro_steps: [...prev.repro_steps, '']
    }));
  };

  const updateReproStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      repro_steps: prev.repro_steps.map((step, i) => i === index ? value : step)
    }));
  };

  const removeReproStep = (index: number) => {
    if (formData.repro_steps.length > 1) {
      setFormData(prev => ({
        ...prev,
        repro_steps: prev.repro_steps.filter((_, i) => i !== index)
      }));
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
      const bugData = {
        org_id: currentOrg.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        severity: formData.severity,
        status: formData.status,
        youtube_url: formData.youtube_url.trim() || null,
        repro_steps: formData.repro_steps.filter(step => step.trim() !== '') as any,
        reporter_id: user.id,
        assignee_id: formData.assignee_id !== 'none' ? formData.assignee_id : null
      };

      const previousAssigneeId = bug ? (bug as any).assignee_id : null;
      const newAssigneeId = formData.assignee_id !== 'none' ? formData.assignee_id : null;

      const { data, error } = bug 
        ? await supabase.from('bug_reports').update(bugData).eq('id', bug.id).select().single()
        : await supabase.from('bug_reports').insert(bugData).select().single();

      if (error) throw error;

      // Create notification if someone was assigned
      if (newAssigneeId && newAssigneeId !== user.id && newAssigneeId !== previousAssigneeId) {
        await supabase.from('notifications').insert({
          user_id: newAssigneeId,
          org_id: currentOrg.id,
          title: 'Bug Assigned to You',
          message: `You have been assigned to bug: "${formData.title.trim()}"`,
          type: 'bug_assigned',
          entity_type: 'bug',
          entity_id: data.id
        });
      }

      toast({
        title: 'Success',
        description: `Bug report ${bug ? 'updated' : 'created'} successfully`
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving bug:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save bug report',
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
            {bug ? 'Edit Bug Report' : 'Create New Bug Report'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the bug..."
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the issue..."
              rows={4}
              className="text-base resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <Select 
              value={formData.severity} 
              onValueChange={(value: BugSeverity) => setFormData(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {bug && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'new' | 'in_progress' | 'fixed' | 'closed') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>  
                  <SelectItem value="closed">Closed</SelectItem>
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

          <div className="space-y-2">
            <Label htmlFor="youtube">Video URL (Optional)</Label>
            <Input
              id="youtube"
              value={formData.youtube_url}
              onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
              placeholder="https://youtube.com/watch?v=... or other video URL"
              className="text-base"
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Reproduction Steps</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReproStep}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.repro_steps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium mt-1">
                        {index + 1}
                      </div>
                      <Input
                        value={step}
                        onChange={(e) => updateReproStep(index, e.target.value)}
                        placeholder={`Step ${index + 1}...`}
                        className="flex-1 text-base"
                      />
                      {formData.repro_steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReproStep(index)}
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive mt-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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
              {loading ? 'Saving...' : (bug ? 'Update Bug' : 'Create Bug')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}