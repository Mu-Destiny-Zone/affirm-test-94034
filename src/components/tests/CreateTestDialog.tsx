import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, GripVertical } from 'lucide-react';
import { TestStep } from '@/lib/types';
import { useOrganization } from '@/contexts/OrganizationContext';

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCreated: () => void;
  projects: { id: string; name: string }[];
}

export function CreateTestDialog({ open, onOpenChange, onTestCreated, projects }: CreateTestDialogProps) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 0,
    steps: [{ title: '', expected: '', required: true }] as TestStep[]
  });

  const addStep = () => {
    setNewTest(prev => ({
      ...prev,
      steps: [...prev.steps, { title: '', expected: '', required: true }]
    }));
  };

  const updateStep = (index: number, field: keyof TestStep, value: any) => {
    setNewTest(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const removeStep = (index: number) => {
    if (newTest.steps.length > 1) {
      setNewTest(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index)
      }));
    }
  };

  const handleCreate = async () => {
    if (!user || !currentOrg || !newTest.title.trim() || !newTest.project_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields including project',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tests')
        .insert({
          org_id: currentOrg.id,
          project_id: newTest.project_id,
          title: newTest.title.trim(),
          description: newTest.description.trim() || null,
          priority: newTest.priority,
          steps: newTest.steps as any,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test created successfully'
      });

      setNewTest({
        title: '',
        description: '',
        project_id: '',
        priority: 0,
        steps: [{ title: '', expected: '', required: true }]
      });
      onOpenChange(false);
      onTestCreated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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
          <DialogTitle>Create New Test</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newTest.title}
                onChange={(e) => setNewTest(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter test title..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTest.description}
                onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this test validates..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={newTest.project_id}
                onValueChange={(value) => setNewTest(prev => ({ ...prev, project_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTest.priority.toString()}
                onValueChange={(value) => setNewTest(prev => ({ ...prev, priority: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Low</SelectItem>
                  <SelectItem value="1">Medium</SelectItem>
                  <SelectItem value="2">High</SelectItem>
                  <SelectItem value="3">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Test Steps</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {newTest.steps.map((step, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        Step {index + 1}
                      </CardTitle>
                      {newTest.steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid gap-2">
                      <Label htmlFor={`step-${index}-title`}>Action</Label>
                      <Input
                        id={`step-${index}-title`}
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="What action should be performed?"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor={`step-${index}-expected`}>Expected Result</Label>
                      <Textarea
                        id={`step-${index}-expected`}
                        value={step.expected}
                        onChange={(e) => updateStep(index, 'expected', e.target.value)}
                        placeholder="What should happen?"
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`step-${index}-required`}
                        checked={step.required}
                        onCheckedChange={(checked) => updateStep(index, 'required', checked)}
                      />
                      <Label htmlFor={`step-${index}-required`} className="text-sm">
                        Required step (test fails if this step fails)
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}