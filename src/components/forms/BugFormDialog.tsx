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
import { BugReport, Project, BugSeverity } from '@/lib/types';
import { Plus, X } from 'lucide-react';

interface BugFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bug?: BugReport | null;
  onSuccess: () => void;
}

export function BugFormDialog({ open, onOpenChange, bug, onSuccess }: BugFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: 'general',
    severity: 'medium' as BugSeverity,
    status: 'new' as 'new' | 'in_progress' | 'fixed' | 'closed',
    youtube_url: '',
    repro_steps: ['']
  });

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (bug) {
        setFormData({
          title: bug.title,
          description: bug.description || '',
          project_id: bug.project_id || 'general',
          severity: bug.severity,
          status: bug.status as 'new' | 'in_progress' | 'fixed' | 'closed',
          youtube_url: bug.youtube_url || '',
          repro_steps: Array.isArray(bug.repro_steps) ? bug.repro_steps as string[] : ['']
        });
      } else {
        resetForm();
      }
    }
  }, [open, bug]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: 'general',
      severity: 'medium',
      status: 'new',
      youtube_url: '',
      repro_steps: ['']
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
    if (!user || !formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the title',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      let orgId = null;
      
      if (formData.project_id && formData.project_id !== 'general') {
        const project = projects.find(p => p.id === formData.project_id);
        if (project) {
          orgId = project.org_id;
        }
      } else {
        // For general bugs, get user's org
        const { data: orgMember } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('profile_id', user.id)
          .single();
        
        if (orgMember) {
          orgId = orgMember.org_id;
        }
      }

      const bugData = {
        org_id: orgId,
        project_id: formData.project_id === 'general' ? null : formData.project_id || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        severity: formData.severity,
        status: formData.status,
        youtube_url: formData.youtube_url.trim() || null,
        repro_steps: formData.repro_steps.filter(step => step.trim() !== '') as any,
        reporter_id: user.id
      };

      const { error } = bug 
        ? await supabase.from('bug_reports').update(bugData).eq('id', bug.id)
        : await supabase.from('bug_reports').insert(bugData);

      if (error) throw error;

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="General bug or select project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Bug</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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